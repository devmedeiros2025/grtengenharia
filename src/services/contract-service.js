import { getDb } from '../db/schema.js';

export function listContracts({ status, type, company_id, equipment_id, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (status) { conditions.push('ct.status = ?'); params.push(status); }
  if (type) { conditions.push('ct.type = ?'); params.push(type); }
  if (company_id) { conditions.push('ct.company_id = ?'); params.push(company_id); }
  if (equipment_id) { conditions.push('ct.equipment_id = ?'); params.push(equipment_id); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM contracts ct ${where}`).get(...params);
  const total = countRow.total;

  const rows = db.prepare(`
    SELECT ct.*, e.name as equipment_name, c.name as company_name
    FROM contracts ct
    LEFT JOIN equipment e ON ct.equipment_id = e.id
    LEFT JOIN companies c ON ct.company_id = c.id
    ${where} ORDER BY ct.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { contracts: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getContract(id) {
  const db = getDb();
  return db.prepare(`
    SELECT ct.*, e.name as equipment_name, c.name as company_name
    FROM contracts ct
    LEFT JOIN equipment e ON ct.equipment_id = e.id
    LEFT JOIN companies c ON ct.company_id = c.id
    WHERE ct.id = ?
  `).get(id);
}

export function createContract(data) {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO contracts (title, company_id, equipment_id, type, value, start_date, end_date, status, notes, file)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(data.title, data.company_id || null, data.equipment_id || null,
         data.type || 'rental', data.value || 0, data.start_date || null, data.end_date || null,
         data.status || 'active', data.notes || null, data.file || null);
  return getContract(result.lastInsertRowid);
}

export function updateContract(id, data) {
  const db = getDb();
  const existing = getContract(id);
  if (!existing) return null;

  const fields = [];
  const params = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue;
    fields.push(`${key} = ?`);
    params.push(value);
  }
  if (fields.length === 0) return existing;
  fields.push('updated_at = datetime(\'now\')');
  params.push(id);

  db.prepare(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getContract(id);
}

export function deleteContract(id) {
  const db = getDb();
  const existing = getContract(id);
  if (!existing) return false;
  db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
  return true;
}
