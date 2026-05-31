import { getDb } from '../db/schema.js';

export function listEquipment({ status, type, search, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (type) { conditions.push('type = ?'); params.push(type); }
  if (search) {
    conditions.push('(name LIKE ? OR brand LIKE ? OR model LIKE ? OR plate LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM equipment ${where}`).get(...params);
  const total = countRow.total;
  const rows = db.prepare(`SELECT * FROM equipment ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  return { equipment: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getEquipment(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
}

export function createEquipment(data) {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO equipment (name, type, brand, model, plate, year, status, daily_rate, photo, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(data.name, data.type || null, data.brand || null, data.model || null, data.plate || null,
         data.year || null, data.status || 'available', data.daily_rate || 0, data.photo || null, data.notes || null);
  return getEquipment(result.lastInsertRowid);
}

export function updateEquipment(id, data) {
  const db = getDb();
  const existing = getEquipment(id);
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

  db.prepare(`UPDATE equipment SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getEquipment(id);
}

export function deleteEquipment(id) {
  const db = getDb();
  const existing = getEquipment(id);
  if (!existing) return false;
  db.prepare('DELETE FROM equipment WHERE id = ?').run(id);
  return true;
}
