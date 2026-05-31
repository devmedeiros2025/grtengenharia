import db from '../db/adapter.js';

export async function getConversionRate() {
  const [totalRow, convertedRow] = await Promise.all([
    db.row('SELECT COUNT(*) as c FROM leads'),
    db.row("SELECT COUNT(*) as c FROM leads WHERE status = 'converted'"),
  ]);
  const total = totalRow?.c || 1;
  const converted = convertedRow?.c || 0;
  return { total, converted, rate: parseFloat(((converted / total) * 100).toFixed(1)) };
}

export async function getAverageTicket() {
  const row = await db.row("SELECT AVG(value) as avg FROM deals WHERE stage = 'closed_won'");
  return { averageTicket: row?.avg ? parseFloat(Number(row.avg).toFixed(2)) : 0 };
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
  return {
    total, inUse, available, maintenance,
    utilization: parseFloat(((inUse / total) * 100).toFixed(1)),
  };
}

export async function getLeadsBySource() {
  return db.raw("SELECT source, COUNT(*) as count FROM leads WHERE source IS NOT NULL AND source != '' GROUP BY source ORDER BY count DESC");
}

export async function getDealsByMonth() {
  return db.raw(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
           COUNT(*) as count,
           SUM(value) as total_value
    FROM deals
    GROUP BY month
    ORDER BY month ASC
  `);
}

export async function getTopClients(limit = 5) {
  return db.raw(`
    SELECT c.id, c.name, COUNT(d.id) as deal_count, SUM(d.value) as total_value
    FROM companies c
    JOIN deals d ON d.company_id = c.id
    WHERE d.stage = 'closed_won'
    GROUP BY c.id
    ORDER BY total_value DESC
    LIMIT ?
  `, [limit]);
}

export async function getTotalCounts() {
  const [l, d, c, e, ct, t] = await Promise.all([
    db.row('SELECT COUNT(*) as c FROM leads'),
    db.row('SELECT COUNT(*) as c FROM deals'),
    db.row('SELECT COUNT(*) as c FROM companies'),
    db.row('SELECT COUNT(*) as c FROM equipment'),
    db.row('SELECT COUNT(*) as c FROM contracts'),
    db.row('SELECT COUNT(*) as c FROM tasks'),
  ]);
  return {
    totalLeads: l?.c || 0,
    totalDeals: d?.c || 0,
    totalCompanies: c?.c || 0,
    totalEquipment: e?.c || 0,
    totalContracts: ct?.c || 0,
    totalTasks: t?.c || 0,
  };
}
