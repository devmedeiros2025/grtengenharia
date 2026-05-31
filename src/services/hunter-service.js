import { getDb } from '../db/schema.js';

export function getAllEnrichments({ page = 1, limit = 10, source, lead_id } = {}) {
  const db = getDb();
  let sql = 'SELECT le.*, l.name as lead_name FROM lead_enrichments le LEFT JOIN leads l ON l.id = le.lead_id WHERE 1=1';
  const params = [];
  if (source) { sql += ' AND le.source = ?'; params.push(source); }
  if (lead_id) { sql += ' AND le.lead_id = ?'; params.push(Number(lead_id)); }
  const total = db.prepare(sql.replace('SELECT le.*, l.name as lead_name', 'SELECT COUNT(*) as total')).get(...params).total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY le.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const enrichments = db.prepare(sql).all(...params);
  return { enrichments, total, page, totalPages };
}

export function getEnrichmentById(id) {
  const db = getDb();
  return db.prepare('SELECT le.*, l.name as lead_name FROM lead_enrichments le LEFT JOIN leads l ON l.id = le.lead_id WHERE le.id = ?').get(id) || null;
}

export function addEnrichment({ lead_id, source, data, score }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO lead_enrichments (lead_id, source, data, score)
    VALUES (?, ?, ?, ?)
  `).run(lead_id || null, source || 'manual', data || '{}', score || null);
  return db.prepare('SELECT * FROM lead_enrichments WHERE id = ?').get(Number(result.lastInsertRowid));
}

export function removeEnrichment(id) {
  const db = getDb();
  return db.prepare('DELETE FROM lead_enrichments WHERE id = ?').run(id).changes > 0;
}

export function getLeadScore(lead_id) {
  const db = getDb();
  const enrichments = db.prepare('SELECT score FROM lead_enrichments WHERE lead_id = ? AND score IS NOT NULL').all(lead_id);
  if (enrichments.length === 0) return { lead_id, avgScore: 0, sources: 0 };
  const avgScore = parseFloat((enrichments.reduce((a, b) => a + parseFloat(b.score || 0), 0) / enrichments.length).toFixed(1));
  const sources = db.prepare('SELECT COUNT(DISTINCT source) as c FROM lead_enrichments WHERE lead_id = ?').get(lead_id).c || 0;
  return { lead_id, avgScore, sources };
}

export function getTopLeads(limit = 10) {
  const db = getDb();
  return db.prepare(`
    SELECT l.*, 
      COALESCE((SELECT AVG(le.score) FROM lead_enrichments le WHERE le.lead_id = l.id), 0) as avg_score,
      (SELECT COUNT(*) FROM lead_enrichments le WHERE le.lead_id = l.id) as enrichment_count
    FROM leads l
    WHERE l.status NOT IN ('lost', 'converted')
    ORDER BY avg_score DESC, enrichment_count DESC
    LIMIT ?
  `).all(limit);
}
