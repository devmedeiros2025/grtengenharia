import db from '../db/adapter.js';

export async function getAllAvailability({ equipment_id, start_date, end_date } = {}) {
  let sql = 'SELECT ra.*, e.name as equipment_name FROM rental_availability ra LEFT JOIN equipment e ON e.id = ra.equipment_id WHERE 1=1';
  const params = [];
  if (equipment_id) { sql += ' AND ra.equipment_id = ?'; params.push(Number(equipment_id)); }
  if (start_date) { sql += ' AND ra.end_date >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND ra.start_date <= ?'; params.push(end_date); }
  sql += ' ORDER BY ra.start_date ASC';
  return db.raw(sql, params);
}

export async function blockDates(equipment_id, start_date, end_date, status = 'reserved', contract_id, notes) {
  return db.create('rental_availability', {
    equipment_id, start_date, end_date, status,
    contract_id: contract_id || null, notes: notes || null,
  });
}

export async function removeBlock(id) {
  return db.delete('rental_availability', id);
}

export async function getFleetUtilization() {
  const [totalRow, inUseRow, availableRow, maintenanceRow] = await Promise.all([
    db.row('SELECT COUNT(*) as c FROM equipment'),
    db.row("SELECT COUNT(*) as c FROM equipment WHERE status = 'in_use'"),
    db.row("SELECT COUNT(*) as c FROM equipment WHERE status = 'available'"),
    db.row("SELECT COUNT(*) as c FROM equipment WHERE status = 'maintenance'"),
  ]);
  const total = totalRow?.c || 1;
  const inUse = inUseRow?.c || 0;
  const available = availableRow?.c || 0;
  const maintenance = maintenanceRow?.c || 0;
  return { total, inUse, available, maintenance, utilization: parseFloat(((inUse / total) * 100).toFixed(1)) };
}

export async function getAvailableEquipment(start_date, end_date) {
  if (!start_date || !end_date) {
    return db.select('equipment', { conditions: [{ field: 'status', op: 'eq', value: 'available' }], orderBy: ['name', 'asc'] });
  }
  return db.raw(`
    SELECT e.* FROM equipment e
    WHERE e.status != 'maintenance'
    AND e.id NOT IN (
      SELECT ra.equipment_id FROM rental_availability ra
      WHERE ra.start_date <= ? AND ra.end_date >= ?
    )
    ORDER BY e.name ASC
  `, [end_date, start_date]);
}

export async function getContractsEndingSoon(days = 15) {
  return db.raw(`
    SELECT c.*, e.name as equipment_name, co.name as company_name
    FROM contracts c
    LEFT JOIN equipment e ON e.id = c.equipment_id
    LEFT JOIN companies co ON co.id = c.company_id
    WHERE c.status = 'active'
    AND c.end_date IS NOT NULL
    AND c.end_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
    ORDER BY c.end_date ASC
  `, [days]);
}
