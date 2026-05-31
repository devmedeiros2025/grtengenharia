import { getDb } from '../db/schema.js';

export function getAll({ page = 1, limit = 10, status, lead_id, user_id } = {}) {
  const db = getDb();
  let sql = 'SELECT f.*, l.name as lead_name FROM followups f LEFT JOIN leads l ON l.id = f.lead_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND f.status = ?'; params.push(status); }
  if (lead_id) { sql += ' AND f.lead_id = ?'; params.push(Number(lead_id)); }
  if (user_id) { sql += ' AND f.user_id = ?'; params.push(Number(user_id)); }
  const total = db.prepare(sql.replace('SELECT f.*, l.name as lead_name', 'SELECT COUNT(*) as total')).get(...params).total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY f.due_date ASC, f.priority DESC';
  params.push(limit, offset);
  const followups = db.prepare(sql).all(...params);
  return { followups, total, page, totalPages };
}

export function getById(id) {
  const db = getDb();
  return db.prepare('SELECT f.*, l.name as lead_name FROM followups f LEFT JOIN leads l ON l.id = f.lead_id WHERE f.id = ?').get(id) || null;
}

export function create({ lead_id, action, description, due_date, priority, user_id, notes }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO followups (lead_id, action, description, due_date, priority, user_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(lead_id || null, action || 'call', description || null, due_date || null, priority || 'medium', user_id || null, notes || null);
  return getById(Number(result.lastInsertRowid));
}

export function update(id, data) {
  const db = getDb();
  const fields = [];
  const params = [];
  for (const key of ['lead_id', 'action', 'description', 'due_date', 'priority', 'status', 'completed_at', 'user_id', 'notes']) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
  }
  if (data.status === 'completed' && !data.completed_at) {
    fields.push("completed_at = datetime('now')");
  }
  if (fields.length === 0) return getById(id);
  fields.push("updated_at = datetime('now')");
  db.prepare(`UPDATE followups SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  return getById(id);
}

export function delete_(id) {
  const db = getDb();
  return db.prepare('DELETE FROM followups WHERE id = ?').run(id).changes > 0;
}

export function getOverdue() {
  const db = getDb();
  return db.prepare(`
    SELECT f.*, l.name as lead_name
    FROM followups f
    LEFT JOIN leads l ON l.id = f.lead_id
    WHERE f.status = 'pending' AND f.due_date <= date('now')
    ORDER BY f.due_date ASC
  `).all();
}

export function complete(id) {
  return update(id, { status: 'completed' });
}
