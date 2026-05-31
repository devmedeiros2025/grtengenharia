import { getDb } from '../db/schema.js';

export function getAllAvailability({ equipment_id, start_date, end_date } = {}) {
  const db = getDb();
  let sql = 'SELECT ra.*, e.name as equipment_name FROM rental_availability ra LEFT JOIN equipment e ON e.id = ra.equipment_id WHERE 1=1';
  const params = [];
  if (equipment_id) { sql += ' AND ra.equipment_id = ?'; params.push(Number(equipment_id)); }
  if (start_date) { sql += ' AND ra.end_date >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND ra.start_date <= ?'; params.push(end_date); }
  sql += ' ORDER BY ra.start_date ASC';
  return db.prepare(sql).all(...params);
}

export function blockDates(equipment_id, start_date, end_date, status = 'reserved', contract_id, notes) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO rental_availability (equipment_id, start_date, end_date, status, contract_id, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(equipment_id, start_date, end_date, status, contract_id || null, notes || null);
  return db.prepare('SELECT * FROM rental_availability WHERE id = ?').get(Number(result.lastInsertRowid));
}

export function removeBlock(id) {
  const db = getDb();
  return db.prepare('DELETE FROM rental_availability WHERE id = ?').run(id).changes > 0;
}

export function getFleetUtilization() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM equipment').get().c || 1;
  const inUse = db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'in_use'").get().c || 0;
  const available = db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'available'").get().c || 0;
  const maintenance = db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'maintenance'").get().c || 0;
  return { total, inUse, available, maintenance, utilization: parseFloat(((inUse / total) * 100).toFixed(1)) };
}

export function getAvailableEquipment(start_date, end_date) {
  const db = getDb();
  if (!start_date || !end_date) {
    return db.prepare("SELECT * FROM equipment WHERE status = 'available' ORDER BY name ASC").all();
  }
  // Equipment that has no conflicting availability blocks in the date range AND is not in maintenance
  return db.prepare(`
    SELECT e.* FROM equipment e
    WHERE e.status != 'maintenance'
    AND e.id NOT IN (
      SELECT ra.equipment_id FROM rental_availability ra
      WHERE ra.start_date <= ? AND ra.end_date >= ?
    )
    ORDER BY e.name ASC
  `).all(end_date, start_date);
}

export function getContractsEndingSoon(days = 15) {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, e.name as equipment_name, co.name as company_name
    FROM contracts c
    LEFT JOIN equipment e ON e.id = c.equipment_id
    LEFT JOIN companies co ON co.id = c.company_id
    WHERE c.status = 'active'
    AND c.end_date IS NOT NULL
    AND c.end_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
    ORDER BY c.end_date ASC
  `).all(days);
}
