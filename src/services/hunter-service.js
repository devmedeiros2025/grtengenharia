import db from '../db/adapter.js';

export async function getAllEnrichments({ page = 1, limit = 10, source, lead_id } = {}) {
  let sql = 'SELECT le.*, l.name as lead_name FROM lead_enrichments le LEFT JOIN leads l ON l.id = le.lead_id WHERE 1=1';
  const params = [];
  if (source) { sql += ' AND le.source = ?'; params.push(source); }
  if (lead_id) { sql += ' AND le.lead_id = ?'; params.push(Number(lead_id)); }
  const totalRow = await db.row(sql.replace('SELECT le.*, l.name as lead_name', 'SELECT COUNT(*) as total'), params);
  const total = totalRow?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY le.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const enrichments = await db.raw(sql, params);
  return { enrichments, total, page, totalPages };
}

export async function getEnrichmentById(id) {
  return db.row('SELECT le.*, l.name as lead_name FROM lead_enrichments le LEFT JOIN leads l ON l.id = le.lead_id WHERE le.id = ?', [id]);
}

export async function addEnrichment({ lead_id, source, data, score }) {
  return db.create('lead_enrichments', {
    lead_id: lead_id || null, source: source || 'manual', data: data || '{}', score: score || null,
  });
}

export async function removeEnrichment(id) {
  return db.delete('lead_enrichments', id);
}

export async function getLeadScore(lead_id) {
  const enrichments = await db.raw('SELECT score FROM lead_enrichments WHERE lead_id = ? AND score IS NOT NULL', [lead_id]);
  if (enrichments.length === 0) return { lead_id, avgScore: 0, sources: 0 };
  const avgScore = parseFloat((enrichments.reduce((a, b) => a + parseFloat(b.score || 0), 0) / enrichments.length).toFixed(1));
  const sourceRow = await db.row('SELECT COUNT(DISTINCT source) as c FROM lead_enrichments WHERE lead_id = ?', [lead_id]);
  const sources = sourceRow?.c || 0;
  return { lead_id, avgScore, sources };
}

export async function getTopLeads(limit = 10) {
  return db.raw(`
    SELECT l.*, 
      COALESCE((SELECT AVG(le.score) FROM lead_enrichments le WHERE le.lead_id = l.id), 0) as avg_score,
      (SELECT COUNT(*) FROM lead_enrichments le WHERE le.lead_id = l.id) as enrichment_count
    FROM leads l
    WHERE l.status NOT IN ('lost', 'converted')
    ORDER BY avg_score DESC, enrichment_count DESC
    LIMIT ?
  `, [limit]);
}
