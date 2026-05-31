import db from '../db/adapter.js';

export async function listDeals(filters = {}) {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;

  // Use raw SQL to avoid Supabase table alias incompatibility
  const params = [];
  const where = [];
  if (filters.stage) { where.push('d.stage = ?'); params.push(filters.stage); }
  if (filters.search) { where.push('d.title ILIKE ?'); params.push(`%${filters.search}%`); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await db.row(`SELECT COUNT(*) as total FROM deals d ${whereClause}`, params);
  const total = countRow?.total || 0;

  const offset = (page - 1) * limit;
  const rows = await db.raw(
    `SELECT d.*, c.name as company_name FROM deals d LEFT JOIN companies c ON d.company_id = c.id ${whereClause} ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { deals: rows || [], total, page, limit, totalPages: Math.ceil(total / limit) };
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
