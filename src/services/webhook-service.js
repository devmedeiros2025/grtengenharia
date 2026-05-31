import db from '../db/adapter.js';
import { logger } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const { nanoid } = await import('nanoid');
  const token = nanoid(32);
  const result = await db.create('webhook_inbound', { name, token, source: source || null });
  return { id: result.id, name, token, source };
}

export async function getInboundWebhookByToken(token) {
  const rows = await db.select('webhook_inbound', { conditions: [{ field: 'token', op: 'eq', value: token }, { field: 'is_active', op: 'eq', value: 1 }] });
  return rows?.[0] || null;
}

export async function listInboundWebhooks() {
  return db.raw('SELECT * FROM webhook_inbound ORDER BY created_at DESC');
}

export async function deleteInboundWebhook(id) {
  return db.delete('webhook_inbound', id);
}

// ---------------------------------------------------------------------------
// Outbound Webhooks — disparados quando eventos ocorrem
// ---------------------------------------------------------------------------

export async function listOutboundWebhooks() {
  return db.raw('SELECT * FROM webhook_outbound ORDER BY created_at DESC');
}

export async function createOutboundWebhook({ name, url, token, events }) {
  const eventStr = Array.isArray(events) ? events.join(',') : events;
  const result = await db.create('webhook_outbound', { name, url, token: token || null, event: eventStr });
  return { id: result.id, name, url, events: eventStr.split(','), event: eventStr };
}

export async function updateOutboundWebhook(id, data) {
  const existing = await db.get('webhook_outbound', id);
  if (!existing) return null;
  await db.update('webhook_outbound', id, data);
  return db.get('webhook_outbound', id);
}

export async function deleteOutboundWebhook(id) {
  return db.delete('webhook_outbound', id);
}

// ---------------------------------------------------------------------------
// Dispatcher — envia eventos para URLs configuradas
// ---------------------------------------------------------------------------

export async function dispatchOutboundWebhooks(event, payload) {
  const hooks = await db.raw("SELECT * FROM webhook_outbound WHERE is_active = 1");

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

        await db.raw(`
          INSERT INTO webhook_logs (direction, webhook_id, source, payload, response_status, response_body)
          VALUES ('outbound', ?, ?, ?, ?, ?)
        `, [hook.id, hook.event, body, res.status, await res.text().catch(() => '')]);

        logger.info(`Outbound webhook ${hook.name} -> ${res.status} (attempt ${attempt})`);
        lastError = null;
        break; // success
      } catch (err) {
        lastError = err;
        logger.warn(`Outbound webhook ${hook.name} attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 500 - 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    if (lastError) {
      await db.raw(`
        INSERT INTO webhook_logs (direction, webhook_id, source, payload, response_status, response_body)
        VALUES ('outbound', ?, ?, ?, 0, ?)
      `, [hook.id, hook.event, body, lastError.message]);

      logger.error(`Outbound webhook ${hook.name} failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export async function listWebhookLogs({ direction, limit = 50 } = {}) {
  let sql = 'SELECT * FROM webhook_logs';
  const params = [];
  if (direction) {
    sql += ' WHERE direction = ?';
    params.push(direction);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  const rows = await db.raw(sql, params);
  return rows.map(normalizeLog);
}

export async function logInboundWebhook(webhookId, source, payload, statusCode, responseBody) {
  await db.raw(`
    INSERT INTO webhook_logs (direction, webhook_id, source, payload, response_status, response_body)
    VALUES ('inbound', ?, ?, ?, ?, ?)
  `, [webhookId, source, payload, statusCode, responseBody || '']);
}

export async function updateInboundWebhookSource(id, source) {
  await db.update('webhook_inbound', id, { source });
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export async function listApiKeys() {
  return db.raw('SELECT id, name, is_active, created_at FROM api_keys ORDER BY created_at DESC');
}

export async function createApiKey(name) {
  const { nanoid } = await import('nanoid');
  const key = `grt_${nanoid(48)}`;
  const result = await db.create('api_keys', { name, key });
  return { id: result.id, name, key };
}

export async function validateApiKey(key) {
  const rows = await db.select('api_keys', { conditions: [{ field: 'key', op: 'eq', value: key }, { field: 'is_active', op: 'eq', value: 1 }] });
  return rows?.[0] || null;
}

export async function deleteApiKey(id) {
  return db.delete('api_keys', id);
}
