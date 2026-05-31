import { getDb } from '../db/schema.js';

export function getConversionRate() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM leads').get().c || 1;
  const converted = db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'converted'").get().c || 0;
  return { total, converted, rate: parseFloat(((converted / total) * 100).toFixed(1)) };
}

export function getAverageTicket() {
  const db = getDb();
  const row = db.prepare("SELECT AVG(value) as avg FROM deals WHERE stage = 'closed_won'").get();
  return { averageTicket: row?.avg ? parseFloat(row.avg.toFixed(2)) : 0 };
}

export function getFleetUtilization() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM equipment').get().c || 1;
  const inUse = db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'in_use'").get().c || 0;
  const available = db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'available'").get().c || 0;
  const maintenance = db.prepare("SELECT COUNT(*) as c FROM equipment WHERE status = 'maintenance'").get().c || 0;
  return {
    total,
    inUse,
    available,
    maintenance,
    utilization: parseFloat(((inUse / total) * 100).toFixed(1)),
  };
}

export function getLeadsBySource() {
  const db = getDb();
  return db.prepare('SELECT source, COUNT(*) as count FROM leads WHERE source IS NOT NULL AND source != \'\' GROUP BY source ORDER BY count DESC').all();
}

export function getDealsByMonth() {
  const db = getDb();
  return db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           COUNT(*) as count,
           SUM(value) as total_value
    FROM deals
    GROUP BY month
    ORDER BY month ASC
  `).all();
}

export function getTopClients(limit = 5) {
  const db = getDb();
  return db.prepare(`
    SELECT c.id, c.name, COUNT(d.id) as deal_count, SUM(d.value) as total_value
    FROM companies c
    JOIN deals d ON d.company_id = c.id
    WHERE d.stage = 'closed_won'
    GROUP BY c.id
    ORDER BY total_value DESC
    LIMIT ?
  `).all(limit);
}

export function getTotalCounts() {
  const db = getDb();
  return {
    totalLeads: db.prepare('SELECT COUNT(*) as c FROM leads').get().c,
    totalDeals: db.prepare('SELECT COUNT(*) as c FROM deals').get().c,
    totalCompanies: db.prepare('SELECT COUNT(*) as c FROM companies').get().c,
    totalEquipment: db.prepare('SELECT COUNT(*) as c FROM equipment').get().c,
    totalContracts: db.prepare('SELECT COUNT(*) as c FROM contracts').get().c,
    totalTasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
  };
}
