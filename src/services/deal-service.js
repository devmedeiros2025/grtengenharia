import db from '../db/adapter.js';

export async function listDeals(filters = {}) {
  const conditions = [];
  if (filters.stage) conditions.push({ field: 'd.stage', op: 'eq', value: filters.stage });
  if (filters.search) conditions.push({ field: 'd.title', op: 'like', value: filters.search });

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;

  const result = await db.paginate('deals d', {
    columns: 'd.*, c.name as company_name',
    conditions: conditions.length > 0 ? conditions : null,
    joins: [
      { table: 'companies c', foreignKey: 'd.company_id', columns: 'name as company_name' },
    ],
    page, limit,
    orderBy: ['d.updated_at', 'desc'],
  });

  return { deals: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages };
}

export async function getDeal(id) {
  return db.get('deals', id);
}

export async function createDeal(data) {
  const stage = data.stage || 'prospecting';
  const stageRow = await db.row('SELECT probability FROM pipeline_stages WHERE stage_key = ?', [stage]);
  const probability = stageRow ? stageRow.probability : 10;

  return db.create('deals', {
    title: data.title, value: data.value || 0, currency: data.currency || 'BRL',
    stage, probability, company_id: data.company_id || null,
    contact_name: data.contact_name || null, contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null, source: data.source || null, notes: data.notes || null,
  });
}

export async function updateDeal(id, data) {
  const existing = await db.get('deals', id);
  if (!existing) return null;

  // If stage is changing, update probability from pipeline config
  if (data.stage) {
    const stageRow = await db.row('SELECT probability FROM pipeline_stages WHERE stage_key = ?', [data.stage]);
    if (stageRow) data.probability = stageRow.probability;
  }

  // If closing (won/lost), set closed_at
  if (data.stage === 'won' || data.stage === 'lost') {
    data.closed_at = new Date().toISOString();
  }

  return db.update('deals', id, data);
}

export async function deleteDeal(id) {
  return db.delete('deals', id);
}

export async function getDealStats() {
  const [total, won, open, pipeline] = await Promise.all([
    db.row('SELECT COUNT(*) as c FROM deals'),
    db.row("SELECT COUNT(*) as c, COALESCE(SUM(value),0) as v FROM deals WHERE stage = 'won'"),
    db.row("SELECT COUNT(*) as c, COALESCE(SUM(value),0) as v FROM deals WHERE stage NOT IN ('won','lost')"),
    db.raw("SELECT stage, COUNT(*) as c, COALESCE(SUM(value),0) as v FROM deals GROUP BY stage ORDER BY stage"),
  ]);

  return {
    total: total?.c || 0,
    won: { count: won?.c || 0, value: won?.v || 0 },
    open: { count: open?.c || 0, value: open?.v || 0 },
    pipeline: pipeline || [],
  };
}

// ── Pipeline Stages ─────────────────────────────────────────────────────────

export async function listPipelineStages() {
  return db.select('pipeline_stages', { orderBy: ['order_index', 'asc'] });
}
