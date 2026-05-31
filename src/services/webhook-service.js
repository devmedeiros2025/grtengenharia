import { getDb } from '../db/schema.js';
import { logger } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeInboundHook(row) {
  if (!row) return null;
  return { ...row, events: row.event ? row.event.split(',').filter(Boolean) : [] };
}

function normalizeLog(row) {
  if (!row) return null;
  const ok = row.response_status >= 200 && row.response_status < 300;
  return {
    ...row,
    status: ok ? 'success' : 'error',
    webhook_name: row.source || '',
    endpoint: row.source || '',
    payload: row.payload || '{}',
  };
}

// ---------------------------------------------------------------------------
// Inbound Webhooks — tokens gerados para n8n chamar
// ---------------------------------------------------------------------------

export async function createInboundWebhook({ name, source }) {
  const db = getDb();
  const { nanoid } = await import('nanoid');
  const token = nanoid(32);

  const result = db.prepare(`
    INSERT INTO webhook_inbound (name, token, source)
    VALUES (?, ?, ?)
  `).run(name, token, source || null);

  return { id: Number(result.lastInsertRowid), name, token, source };
}

export function getInboundWebhookByToken(token) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM webhook_inbound WHERE token = ? AND is_active = 1
  `).get(token) || null;
}

export function listInboundWebhooks() {
  const db = getDb();
  return db.prepare('SELECT * FROM webhook_inbound ORDER BY created_at DESC').all();
}

export function deleteInboundWebhook(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM webhook_inbound WHERE id = ?').run(id);
  return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Outbound Webhooks — disparados quando eventos ocorrem
// ---------------------------------------------------------------------------

export function listOutboundWebhooks() {
  const db = getDb();
  return db.prepare('SELECT * FROM webhook_outbound ORDER BY created_at DESC').all();
}

export function createOutboundWebhook({ name, url, token, events }) {
  const db = getDb();
  const eventStr = Array.isArray(events) ? events.join(',') : events;
  const result = db.prepare(`
    INSERT INTO webhook_outbound (name, url, token, event)
    VALUES (?, ?, ?, ?)
  `).run(name, url, token || null, eventStr);
  return { id: Number(result.lastInsertRowid), name, url, events: eventStr.split(','), event: eventStr };
}

export function updateOutboundWebhook(id, data) {
  const db = getDb();
  const sets = [];
  const params = [];
  for (const key of ['name', 'url', 'token', 'event', 'is_active']) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (sets.length === 0) return null;
  db.prepare(`UPDATE webhook_outbound SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return db.prepare('SELECT * FROM webhook_outbound WHERE id = ?').get(id);
}

export function deleteOutboundWebhook(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM webhook_outbound WHERE id = ?').run(id);
  return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Dispatcher — envia eventos para URLs configuradas
// ---------------------------------------------------------------------------

export async function dispatchOutboundWebhooks(event, payload) {
  const db = getDb();
  const hooks = db.prepare(`
    SELECT * FROM webhook_outbound WHERE is_active = 1
  `).all();

  // Filter hooks that contain the event in their comma-separated events list
  const matchedHooks = hooks.filter(h => {
    const events = (h.event || '').split(',').map(e => e.trim());
    return events.includes(event);
  });

  if (matchedHooks.length === 0) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  for (const hook of matchedHooks) {
    const headers = { 'Content-Type': 'application/json' };
    if (hook.token) headers['Authorization'] = `Bearer ${hook.token}`;

    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(hook.url, {
          method: 'POST',
          headers,
          body,
        });

        db.prepare(`
          INSERT INTO webhook_logs (direction, webhook_id, source, payload, response_status, response_body)
          VALUES ('outbound', ?, ?, ?, ?, ?)
        `).run(hook.id, hook.event, body, res.status, await res.text().catch(() => ''));

        logger.info(`Outbound webhook ${hook.name} -> ${res.status} (attempt ${attempt})`);
        lastError = null;
        break; // success
      } catch (err) {
        lastError = err;
        logger.warn(`Outbound webhook ${hook.name} attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 3s, 7s
          const delay = Math.pow(2, attempt) * 500 - 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    if (lastError) {
      db.prepare(`
        INSERT INTO webhook_logs (direction, webhook_id, source, payload, response_status, response_body)
        VALUES ('outbound', ?, ?, ?, 0, ?)
      `).run(hook.id, hook.event, body, lastError.message);

      logger.error(`Outbound webhook ${hook.name} failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export function listWebhookLogs({ direction, limit = 50 } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM webhook_logs';
  const params = [];
  if (direction) {
    sql += ' WHERE direction = ?';
    params.push(direction);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  return rows.map(normalizeLog);
}

export function logInboundWebhook(webhookId, source, payload, statusCode, responseBody) {
  const db = getDb();
  db.prepare(`
    INSERT INTO webhook_logs (direction, webhook_id, source, payload, response_status, response_body)
    VALUES ('inbound', ?, ?, ?, ?, ?)
  `).run(webhookId, source, payload, statusCode, responseBody || '');
}

export function updateInboundWebhookSource(id, source) {
  const db = getDb();
  db.prepare('UPDATE webhook_inbound SET source = ? WHERE id = ?').run(source, id);
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export function listApiKeys() {
  const db = getDb();
  return db.prepare('SELECT id, name, is_active, created_at FROM api_keys ORDER BY created_at DESC').all();
}

export async function createApiKey(name) {
  const db = getDb();
  const { nanoid } = await import('nanoid');
  const key = `grt_${nanoid(48)}`;

  const result = db.prepare('INSERT INTO api_keys (name, key) VALUES (?, ?)').run(name, key);
  return { id: Number(result.lastInsertRowid), name, key };
}

export function validateApiKey(key) {
  const db = getDb();
  return db.prepare('SELECT * FROM api_keys WHERE key = ? AND is_active = 1').get(key) || null;
}

export function deleteApiKey(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  return result.changes > 0;
}
