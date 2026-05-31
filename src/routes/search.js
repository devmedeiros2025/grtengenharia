import { getDb } from '../db/schema.js';

export async function searchRoutes(app) {
  app.get('/api/search', { preHandler: [app.requireAuth] }, async (request) => {
    const q = (request.query.q || '').trim();
    if (!q || q.length < 2) return { results: [] };

    const term = `%${q}%`;
    const db = getDb();

    const leads = db.prepare(`
      SELECT id, name as label, 'lead' as type, status, email
      FROM leads WHERE name LIKE ? OR email LIKE ? OR company LIKE ?
      LIMIT 5
    `).all(term, term, term);

    const companies = db.prepare(`
      SELECT id, name as label, 'company' as type, segment as extra
      FROM companies WHERE name LIKE ? OR email LIKE ? OR cnpj LIKE ?
      LIMIT 5
    `).all(term, term, term);

    const equipment = db.prepare(`
      SELECT id, name as label, 'equipment' as type, brand || ' ' || model as extra
      FROM equipment WHERE name LIKE ? OR brand LIKE ? OR plate LIKE ?
      LIMIT 5
    `).all(term, term, term);

    const orders = db.prepare(`
      SELECT id, title as label, 'service_order' as type, status as extra
      FROM service_orders WHERE title LIKE ? OR description LIKE ?
      LIMIT 5
    `).all(term, term);

    const contracts = db.prepare(`
      SELECT id, title as label, 'contract' as type, status as extra
      FROM contracts WHERE title LIKE ? OR notes LIKE ?
      LIMIT 5
    `).all(term, term);

    return {
      results: [...leads, ...companies, ...equipment, ...orders, ...contracts],
      query: q,
    };
  });
}
