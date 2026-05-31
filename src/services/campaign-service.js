import { getDb } from '../db/schema.js';

export function getAll({ page = 1, limit = 10, status, type } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM campaigns WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  const total = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as total')).get(...params).total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const campaigns = db.prepare(sql).all(...params).map(normalize);
  return { campaigns, total, page, totalPages };
}

export function getById(id) {
  const db = getDb();
  const campaign = normalize(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id));
  if (!campaign) return null;
  campaign.targets = db.prepare('SELECT * FROM campaign_targets WHERE campaign_id = ?').all(id);
  return campaign;
}

export function create({ name, type, description, start_date, end_date, budget, status, notes }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO campaigns (name, type, description, start_date, end_date, budget, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type || 'email', description || null, start_date || null, end_date || null, budget || 0, status || 'draft', notes || null);
  return getById(Number(result.lastInsertRowid));
}

export function update(id, data) {
  const db = getDb();
  const fields = [];
  const params = [];
  for (const key of ['name', 'type', 'description', 'start_date', 'end_date', 'budget', 'status', 'notes']) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
  }
  if (fields.length === 0) return getById(id);
  fields.push("updated_at = datetime('now')");
  db.prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  return getById(id);
}

export function delete_(id) {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM campaign_targets WHERE campaign_id = ?').run(id);
    return db.prepare('DELETE FROM campaigns WHERE id = ?').run(id).changes > 0;
  });
  return transaction();
}

export function addTarget(campaign_id, { name, email, phone, company_id }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO campaign_targets (campaign_id, name, email, phone, company_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(campaign_id, name || null, email || null, phone || null, company_id || null);
  return db.prepare('SELECT * FROM campaign_targets WHERE id = ?').get(Number(result.lastInsertRowid));
}

export function removeTarget(id) {
  const db = getDb();
  return db.prepare('DELETE FROM campaign_targets WHERE id = ?').run(id).changes > 0;
}

function normalize(c) {
  if (!c) return null;
  return { ...c, budget: parseFloat(c.budget || 0), sent_count: c.sent_count || 0, opened_count: c.opened_count || 0, clicked_count: c.clicked_count || 0, replied_count: c.replied_count || 0 };
}
