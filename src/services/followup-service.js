import db from '../db/adapter.js';

export async function getAll({ page = 1, limit = 10, status, lead_id, user_id } = {}) {
  let sql = 'SELECT f.*, l.name as lead_name FROM followups f LEFT JOIN leads l ON l.id = f.lead_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND f.status = ?'; params.push(status); }
  if (lead_id) { sql += ' AND f.lead_id = ?'; params.push(Number(lead_id)); }
  if (user_id) { sql += ' AND f.user_id = ?'; params.push(Number(user_id)); }
  const totalRow = await db.row(sql.replace('SELECT f.*, l.name as lead_name', 'SELECT COUNT(*) as total'), params);
  const total = totalRow?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY f.due_date ASC, f.priority DESC';
  params.push(limit, offset);
  const followups = await db.raw(sql, params);
  return { followups, total, page, totalPages };
}

export async function getById(id) {
  return db.row('SELECT f.*, l.name as lead_name FROM followups f LEFT JOIN leads l ON l.id = f.lead_id WHERE f.id = ?', [id]);
}

export async function create({ lead_id, action, description, due_date, priority, user_id, notes }) {
  const result = await db.create('followups', {
    lead_id: lead_id || null, action: action || 'call', description: description || null,
    due_date: due_date || null, priority: priority || 'medium',
    user_id: user_id || null, notes: notes || null,
  });
  return getById(result.id);
}

export async function update(id, data) {
  const updateData = { ...data };
  if (data.status === 'completed' && !data.completed_at) {
    updateData.completed_at = new Date().toISOString();
  }
  const existing = await db.get('followups', id);
  if (!existing) return null;
  await db.update('followups', id, updateData);
  return getById(id);
}

export async function delete_(id) {
  return db.delete('followups', id);
}

export async function getOverdue() {
  return db.raw(`
    SELECT f.*, l.name as lead_name
    FROM followups f
    LEFT JOIN leads l ON l.id = f.lead_id
    WHERE f.status = 'pending' AND f.due_date <= date('now')
    ORDER BY f.due_date ASC
  `);
}

export async function complete(id) {
  return update(id, { status: 'completed' });
}
