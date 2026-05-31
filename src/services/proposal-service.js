import { getDb } from '../db/schema.js';

export function getAll({ page = 1, limit = 10, status, company_id } = {}) {
  const db = getDb();
  let sql = 'SELECT p.*, c.name as company_name FROM proposals p LEFT JOIN companies c ON c.id = p.company_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (company_id) { sql += ' AND p.company_id = ?'; params.push(Number(company_id)); }
  const total = db.prepare(sql.replace('SELECT p.*, c.name as company_name', 'SELECT COUNT(*) as total')).get(...params).total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const proposals = db.prepare(sql).all(...params).map(normalize);
  return { proposals, total, page, totalPages };
}

export function getById(id) {
  const db = getDb();
  const proposal = normalize(db.prepare('SELECT p.*, c.name as company_name FROM proposals p LEFT JOIN companies c ON c.id = p.company_id WHERE p.id = ?').get(id));
  if (!proposal) return null;
  proposal.items = db.prepare('SELECT * FROM proposal_items WHERE proposal_id = ?').all(id).map(item => ({
    ...item,
    quantity: parseFloat(item.quantity || 0),
    unit_price: parseFloat(item.unit_price || 0),
    total: parseFloat((item.quantity || 0) * (item.unit_price || 0)),
  }));
  return proposal;
}

export function create({ title, company_id, contact_name, valid_until, notes, items = [] }) {
  const db = getDb();
  const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const createProposal = db.prepare(`
    INSERT INTO proposals (title, company_id, contact_name, value, valid_until, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare('INSERT INTO proposal_items (proposal_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    const result = createProposal.run(title, company_id || null, contact_name || null, total, valid_until || null, notes || null);
    const proposalId = Number(result.lastInsertRowid);
    for (const item of items) {
      insertItem.run(proposalId, item.description, parseFloat(item.quantity) || 1, parseFloat(item.unit_price) || 0);
    }
    return proposalId;
  });

  const id = transaction();
  return getById(id);
}

export function update(id, { title, company_id, contact_name, valid_until, status, notes, items }) {
  const db = getDb();
  const transaction = db.transaction(() => {
    const fields = [];
    const params = [];
    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (company_id !== undefined) { fields.push('company_id = ?'); params.push(company_id); }
    if (contact_name !== undefined) { fields.push('contact_name = ?'); params.push(contact_name); }
    if (valid_until !== undefined) { fields.push('valid_until = ?'); params.push(valid_until); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }

    if (items !== undefined) {
      const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
      fields.push('value = ?');
      params.push(total);
      // Replace items
      db.prepare('DELETE FROM proposal_items WHERE proposal_id = ?').run(id);
      const insertItem = db.prepare('INSERT INTO proposal_items (proposal_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)');
      for (const item of items) {
        insertItem.run(id, item.description, parseFloat(item.quantity) || 1, parseFloat(item.unit_price) || 0);
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      db.prepare(`UPDATE proposals SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
    }
  });
  transaction();
  return getById(id);
}

export function delete_(id) {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM proposal_items WHERE proposal_id = ?').run(id);
    return db.prepare('DELETE FROM proposals WHERE id = ?').run(id).changes > 0;
  });
  return transaction();
}

function normalize(p) {
  if (!p) return null;
  return { ...p, value: parseFloat(p.value || 0) };
}
