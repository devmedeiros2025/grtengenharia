import { getDb } from '../db/schema.js';

export function listDeals(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (filters.stage) {
    conditions.push('d.stage = ?');
    params.push(filters.stage);
  }
  if (filters.search) {
    conditions.push('d.title LIKE ?');
    params.push(`%${filters.search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const offset = (page - 1) * limit;

  const baseFrom = 'FROM deals d LEFT JOIN companies c ON d.company_id = c.id';
  const countRow = db.prepare(`SELECT COUNT(*) as total ${baseFrom} ${where}`).get(...params);
  const total = countRow.total;

  const rows = db.prepare(
    `SELECT d.*, c.name as company_name ${baseFrom} ${where} ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return {
    deals: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getDeal(id) {
  const db = getDb();
  return db.prepare(`
    SELECT d.*, c.name as company_name
    FROM deals d LEFT JOIN companies c ON d.company_id = c.id
    WHERE d.id = ?
  `).get(id) || null;
}

export function createDeal(data) {
  const db = getDb();
  const stage = data.stage || 'prospecting';
  const stageConfig = db.prepare('SELECT probability FROM pipeline_stages WHERE stage_key = ?').get(stage);
  const probability = stageConfig ? stageConfig.probability : 10;

  const result = db.prepare(`
    INSERT INTO deals (title, value, currency, stage, probability, company_id, contact_name, contact_email, contact_phone, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.title, data.value || 0, data.currency || 'BRL',
    stage, probability, data.company_id || null,
    data.contact_name || null, data.contact_email || null,
    data.contact_phone || null, data.source || null, data.notes || null
  );
  return getDeal(Number(result.lastInsertRowid));
}

export function updateDeal(id, data) {
  const db = getDb();
  const fields = ['title', 'value', 'currency', 'stage', 'probability', 'company_id', 'contact_name', 'contact_email', 'contact_phone', 'source', 'notes'];
  const sets = [];
  const params = [];

  // If stage is changing, update probability from pipeline config
  if (data.stage) {
    const stageConfig = db.prepare('SELECT probability FROM pipeline_stages WHERE stage_key = ?').get(data.stage);
    if (stageConfig) data.probability = stageConfig.probability;
  }

  // If closing (won/lost), set closed_at
  if (data.stage === 'won' || data.stage === 'lost') {
    sets.push("closed_at = datetime('now')");
  }

  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(data[f]);
    }
  }
  if (sets.length === 0 && !data.closed_at) return null;
  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE deals SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return getDeal(id);
}

export function deleteDeal(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM deals WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getDealStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM deals').get();
  const won = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(value),0) as v FROM deals WHERE stage = 'won'").get();
  const open = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(value),0) as v FROM deals WHERE stage NOT IN ('won','lost')").get();
  const pipeline = db.prepare('SELECT stage, COUNT(*) as c, COALESCE(SUM(value),0) as v FROM deals GROUP BY stage ORDER BY stage').all();
  return {
    total: total.c,
    won: { count: won.c, value: won.v },
    open: { count: open.c, value: open.v },
    pipeline,
  };
}

// ── Pipeline Stages ─────────────────────────────────────────────────────────

export function listPipelineStages() {
  const db = getDb();
  return db.prepare('SELECT * FROM pipeline_stages ORDER BY order_index').all();
}
