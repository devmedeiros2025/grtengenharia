import { getDb } from '../db/schema.js';

function calcSla(level) {
  const now = new Date();
  switch (level) {
    case 3: return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    case 2: return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    default: return new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  }
}

export function getAll({ page = 1, limit = 10, status, priority, category } = {}) {
  const db = getDb();
  let sql = 'SELECT t.*, c.name as company_name FROM tickets t LEFT JOIN companies c ON c.id = t.company_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (category) { sql += ' AND t.category = ?'; params.push(category); }
  const total = db.prepare(sql.replace('SELECT t.*, c.name as company_name', 'SELECT COUNT(*) as total')).get(...params).total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const tickets = db.prepare(sql).all(...params).map(normalize);
  return { tickets, total, page, totalPages };
}

export function getById(id) {
  const db = getDb();
  const ticket = normalize(db.prepare('SELECT t.*, c.name as company_name FROM tickets t LEFT JOIN companies c ON c.id = t.company_id WHERE t.id = ?').get(id));
  if (!ticket) return null;
  ticket.messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(id);
  return ticket;
}

export function create({ title, description, company_id, contact_name, contact_email, contact_phone, category, priority, level, notes }) {
  const db = getDb();
  const sla = calcSla(parseInt(level) || 1);
  const result = db.prepare(`
    INSERT INTO tickets (title, description, company_id, contact_name, contact_email, contact_phone, category, priority, level, sla_deadline, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, company_id || null, contact_name || null, contact_email || null, contact_phone || null, category || 'support', priority || 'medium', parseInt(level) || 1, sla, notes || null);
  return getById(Number(result.lastInsertRowid));
}

export function update(id, data) {
  const db = getDb();
  const fields = [];
  const params = [];
  for (const key of ['title', 'description', 'company_id', 'contact_name', 'contact_email', 'contact_phone', 'category', 'priority', 'level', 'status', 'assigned_to', 'notes']) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
  }
  if (data.status === 'resolved') { fields.push("resolved_at = datetime('now')"); }
  if (data.status === 'closed') { fields.push("closed_at = datetime('now')"); }
  if (fields.length === 0) return getById(id);
  fields.push("updated_at = datetime('now')");
  db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  return getById(id);
}

export function delete_(id) {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM ticket_messages WHERE ticket_id = ?').run(id);
    return db.prepare('DELETE FROM tickets WHERE id = ?').run(id).changes > 0;
  });
  return transaction();
}

export function addMessage(ticket_id, { author, message, is_internal }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO ticket_messages (ticket_id, author, message, is_internal)
    VALUES (?, ?, ?, ?)
  `).run(ticket_id, author || 'Sistema', message, is_internal ? 1 : 0);
  return db.prepare('SELECT * FROM ticket_messages WHERE id = ?').get(Number(result.lastInsertRowid));
}

export function getSlaStats() {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('closed', 'cancelled')").get().c || 1;
  const withinSla = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('closed', 'cancelled') AND sla_deadline > datetime('now')").get().c || 0;
  return {
    total: total,
    withinSla,
    breached: total - withinSla,
    rate: parseFloat(((withinSla / total) * 100).toFixed(1)),
  };
}

function normalize(t) {
  if (!t) return null;
  return { ...t, level: t.level || 1 };
}
