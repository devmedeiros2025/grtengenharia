import db from '../db/adapter.js';

export async function searchRoutes(app) {
  app.get('/api/search', { preHandler: [app.requireAuth] }, async (request) => {
    const q = (request.query.q || '').trim();
    if (!q || q.length < 2) return { results: [] };

    const term = `%${q}%`;

    const leads = await db.raw(`
      SELECT id, name as label, 'lead' as type, status, email
      FROM leads WHERE name ILIKE ? OR email ILIKE ? OR company ILIKE ?
      LIMIT 5
    `, [term, term, term]);

    const companies = await db.raw(`
      SELECT id, name as label, 'company' as type, segment as extra
      FROM companies WHERE name ILIKE ? OR email ILIKE ? OR cnpj ILIKE ?
      LIMIT 5
    `, [term, term, term]);

    const equipment = await db.raw(`
      SELECT id, name as label, 'equipment' as type, brand || ' ' || model as extra
      FROM equipment WHERE name ILIKE ? OR brand ILIKE ? OR plate ILIKE ?
      LIMIT 5
    `, [term, term, term]);

    const orders = await db.raw(`
      SELECT id, title as label, 'service_order' as type, status as extra
      FROM service_orders WHERE title ILIKE ? OR description ILIKE ?
      LIMIT 5
    `, [term, term]);

    const contracts = await db.raw(`
      SELECT id, title as label, 'contract' as type, status as extra
      FROM contracts WHERE title ILIKE ? OR notes ILIKE ?
      LIMIT 5
    `, [term, term]);

    return {
      results: [...leads, ...companies, ...equipment, ...orders, ...contracts],
      query: q,
    };
  });
}
