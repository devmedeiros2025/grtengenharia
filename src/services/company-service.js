import { getDb } from '../db/schema.js';

export function listCompanies(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (filters.search) {
    conditions.push('(name LIKE ? OR email LIKE ? OR cnpj LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM companies ${where}`).get(...params);
  const total = countRow.total;

  const rows = db.prepare(
    `SELECT * FROM companies ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return {
    companies: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getCompany(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) || null;
}

export function createCompany(data) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO companies (name, email, phone, website, cnpj, address, city, state, zip, segment, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name, data.email || null, data.phone || null,
    data.website || null, data.cnpj || null, data.address || null,
    data.city || null, data.state || null, data.zip || null,
    data.segment || null, data.notes || null
  );
  return getCompany(Number(result.lastInsertRowid));
}

export function updateCompany(id, data) {
  const db = getDb();
  const fields = ['name', 'email', 'phone', 'website', 'cnpj', 'address', 'city', 'state', 'zip', 'segment', 'notes', 'status'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(data[f]);
    }
  }
  if (sets.length === 0) return null;
  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return getCompany(id);
}

export function deleteCompany(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM companies WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getCompanyStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM companies').get();
  const active = db.prepare("SELECT COUNT(*) as c FROM companies WHERE status = 'active'").get();
  return { total: total.c, active: active.c };
}
