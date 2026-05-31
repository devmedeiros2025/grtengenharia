import { getDb } from '../db/schema.js';

export function listServiceOrders({ status, priority, equipment_id, client_id, page = 1, limit = 50 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (status) { conditions.push('so.status = ?'); params.push(status); }
  if (priority) { conditions.push('so.priority = ?'); params.push(priority); }
  if (equipment_id) { conditions.push('so.equipment_id = ?'); params.push(equipment_id); }
  if (client_id) { conditions.push('so.client_id = ?'); params.push(client_id); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM service_orders so ${where}`).get(...params);
  const total = countRow.total;

  const rows = db.prepare(`
    SELECT so.*, e.name as equipment_name, c.name as client_name
    FROM service_orders so
    LEFT JOIN equipment e ON so.equipment_id = e.id
    LEFT JOIN companies c ON so.client_id = c.id
    ${where} ORDER BY so.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { orders: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getServiceOrder(id) {
  const db = getDb();
  return db.prepare(`
    SELECT so.*, e.name as equipment_name, c.name as client_name
    FROM service_orders so
    LEFT JOIN equipment e ON so.equipment_id = e.id
    LEFT JOIN companies c ON so.client_id = c.id
    WHERE so.id = ?
  `).get(id);
}

export function createServiceOrder(data) {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO service_orders (title, description, equipment_id, client_id, status, priority, value, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(data.title, data.description || null, data.equipment_id || null, data.client_id || null,
         data.status || 'open', data.priority || 'medium', data.value || 0, data.notes || null);
  return getServiceOrder(result.lastInsertRowid);
}

export function updateServiceOrder(id, data) {
  const db = getDb();
  const existing = getServiceOrder(id);
  if (!existing) return null;

  const fields = [];
  const params = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue;
    fields.push(`${key} = ?`);
    params.push(value);
  }
  if (fields.length === 0) return existing;
  // Auto-set closed_at when status changes to closed
  if (data.status === 'closed' && existing.status !== 'closed') {
    fields.push('closed_at = datetime(\'now\')');
  }
  params.push(id);

  db.prepare(`UPDATE service_orders SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getServiceOrder(id);
}

export function deleteServiceOrder(id) {
  const db = getDb();
  const existing = getServiceOrder(id);
  if (!existing) return false;
  db.prepare('DELETE FROM service_orders WHERE id = ?').run(id);
  return true;
}
