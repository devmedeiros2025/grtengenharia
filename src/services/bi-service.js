import db from '../db/adapter.js';

export async function getConversionRate() {
  const [total, converted] = await Promise.all([
    db.count('leads'),
    db.count('leads', [{ field: 'status', op: 'eq', value: 'converted' }]),
  ]);
  const t = total || 1;
  const c = converted || 0;
  return { total: t, converted: c, rate: parseFloat(((c / t) * 100).toFixed(1)) };
}

export async function getAverageTicket() {
  const rows = await db.select('deals', {
    columns: 'value',
    conditions: [{ field: 'stage', op: 'eq', value: 'closed_won' }],
  });
  const values = rows.map(r => Number(r.value) || 0);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return { averageTicket: parseFloat(avg.toFixed(2)) };
}

export async function getFleetUtilization() {
  const [total, inUse, available, maintenance] = await Promise.all([
    db.count('equipment'),
    db.count('equipment', [{ field: 'status', op: 'eq', value: 'in_use' }]),
    db.count('equipment', [{ field: 'status', op: 'eq', value: 'available' }]),
    db.count('equipment', [{ field: 'status', op: 'eq', value: 'maintenance' }]),
  ]);
  const t = total || 1;
  return {
    total: t, inUse: inUse || 0, available: available || 0, maintenance: maintenance || 0,
    utilization: parseFloat((((inUse || 0) / t) * 100).toFixed(1)),
  };
}

export async function getLeadsBySource() {
  const rows = await db.select('leads', { columns: 'source' });
  const sourceMap = {};
  for (const r of rows) {
    const s = r.source;
    if (s && s !== '') sourceMap[s] = (sourceMap[s] || 0) + 1;
  }
  return Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getDealsByMonth() {
  const rows = await db.select('deals', { columns: 'created_at, value', orderBy: ['created_at', 'asc'] });
  const monthMap = {};
  for (const r of rows) {
    if (!r.created_at) continue;
    const month = r.created_at.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { month, count: 0, total_value: 0 };
    monthMap[month].count++;
    monthMap[month].total_value += (Number(r.value) || 0);
  }
  return Object.values(monthMap);
}

export async function getTopClients(limit = 5) {
  const [companies, deals] = await Promise.all([
    db.select('companies', { columns: 'id, name' }),
    db.select('deals', { columns: 'company_id, value', conditions: [{ field: 'stage', op: 'eq', value: 'closed_won' }] }),
  ]);
  const companyMap = {};
  for (const c of companies) companyMap[c.id] = { id: c.id, name: c.name, deal_count: 0, total_value: 0 };
  for (const d of deals) {
    if (companyMap[d.company_id]) {
      companyMap[d.company_id].deal_count++;
      companyMap[d.company_id].total_value += (Number(d.value) || 0);
    }
  }
  return Object.values(companyMap)
    .filter(c => c.deal_count > 0)
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, limit);
}

export async function getTotalCounts() {
  const [totalLeads, totalDeals, totalCompanies, totalEquipment, totalContracts, totalTasks] = await Promise.all([
    db.count('leads'),
    db.count('deals'),
    db.count('companies'),
    db.count('equipment'),
    db.count('contracts'),
    db.count('tasks'),
  ]);
  return { totalLeads, totalDeals, totalCompanies, totalEquipment, totalContracts, totalTasks };
}

// ── Dashboard chart helpers ────────────────────────────────────────────────

export async function getLeadsByMonth(months = 6) {
  const rows = await db.select('leads', { columns: 'created_at, status', orderBy: ['created_at', 'asc'] });
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
  const monthMap = {};
  for (const r of rows) {
    if (!r.created_at) continue;
    const d = new Date(r.created_at);
    if (d >= cutoff) {
      const m = d.toISOString().slice(0, 7);
      monthMap[m] = (monthMap[m] || 0) + 1;
    }
  }
  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

export async function getDealsByStage() {
  const rows = await db.select('deals', { columns: 'stage, value' });
  const stageMap = {};
  for (const r of rows) {
    const s = r.stage || 'unknown';
    if (!stageMap[s]) stageMap[s] = { stage: s, count: 0, total_value: 0 };
    stageMap[s].count++;
    stageMap[s].total_value += (Number(r.value) || 0);
  }
  return { stages: Object.values(stageMap), wonCount: rows.filter(r => r.stage === 'won').length };
}

export async function getLeadsByStatus() {
  const rows = await db.select('leads', { columns: 'status' });
  const statusMap = {};
  for (const r of rows) {
    const s = r.status || 'unknown';
    statusMap[s] = (statusMap[s] || 0) + 1;
  }
  return Object.entries(statusMap).map(([status, count]) => ({ status, count }));
}

export async function getFunnel() {
  const [total_leads, converted_leads, won_deals] = await Promise.all([
    db.count('leads'),
    db.count('leads', [{ field: 'status', op: 'eq', value: 'converted' }]),
    db.count('deals', [{ field: 'stage', op: 'eq', value: 'won' }]),
  ]);
  return { total_leads, converted_leads, won_deals };
}

export async function getPipelineTotal() {
  const rows = await db.select('deals', { columns: 'value' });
  const total = rows.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
  return { pipeline_total: parseFloat(total.toFixed(2)) };
}
