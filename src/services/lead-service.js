import { getDb } from '../db/schema.js';
import { logger } from '../lib/logger.js';
import { dispatchOutboundWebhooks } from './webhook-service.js';

export function createLead(data) {
  const db = getDb();

  const {
    name, email, phone, company,
    source = 'api', campaign = null,
    message = null, metadata = '{}',
  } = data;

  if (!name || name.trim().length === 0) {
    throw new Error('Nome é obrigatório');
  }

  const stmt = db.prepare(`
    INSERT INTO leads (name, email, phone, company, source, campaign, message, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name.trim(), email || null, phone || null,
    company || null, source, campaign || null,
    message || null, typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
  );

  const lead = getLeadById(Number(result.lastInsertRowid));

  // Dispara outbound webhooks
  dispatchOutboundWebhooks('lead.created', lead).catch(err =>
    logger.error('Error dispatching outbound webhook:', err.message)
  );

  return lead;
}

export function getLeadById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!row) return null;
  return formatLead(row);
}

export function listLeads({ status, source, search, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (source) {
    conditions.push('source = ?');
    params.push(source);
  }
  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ? OR company LIKE ? OR phone LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM leads ${where}`).get(...params);
  const total = countRow.total;

  const rows = db.prepare(
    `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return {
    leads: rows.map(formatLead),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function updateLead(id, data) {
  const db = getDb();
  const lead = getLeadById(id);
  if (!lead) return null;

  const allowed = ['name', 'email', 'phone', 'company', 'status', 'score', 'message', 'metadata'];
  const sets = [];
  const params = [];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(field === 'metadata' && typeof data[field] === 'object'
        ? JSON.stringify(data[field])
        : data[field]);
    }
  }

  if (sets.length === 0) return lead;

  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);

  const updated = getLeadById(id);

  dispatchOutboundWebhooks('lead.updated', updated).catch(err =>
    logger.error('Error dispatching outbound webhook:', err.message)
  );

  return updated;
}

export function deleteLead(id) {
  const db = getDb();
  const lead = getLeadById(id);
  if (!lead) return false;
  db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  return true;
}

export function getLeadsStats() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count FROM leads GROUP BY status
  `).all();

  const total = db.prepare('SELECT COUNT(*) as t FROM leads').get().t;
  const today = db.prepare(`
    SELECT COUNT(*) as t FROM leads WHERE date(created_at) = date('now')
  `).get().t;

  const stats = { total, today, byStatus: {} };
  for (const r of rows) {
    stats.byStatus[r.status] = r.count;
  }
  return stats;
}

function formatLead(row) {
  return {
    ...row,
    metadata: tryParseJson(row.metadata),
  };
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
