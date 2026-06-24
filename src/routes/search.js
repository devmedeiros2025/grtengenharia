import db from '../db/adapter.js';

export async function searchRoutes(app) {
  app.get('/api/search', { preHandler: [app.requireAuth], schema: { tags: ['Search'], summary: 'Pesquisa global', description: 'Pesquisa por leads, empresas, equipamentos, OS e contratos' } }, async (request) => {
    const q = (request.query.q || '').trim();
    if (!q || q.length < 2) return { results: [] };

    const term = `%${q}%`;

    const likeOp = process.env.DB_BACKEND === 'local' ? 'LIKE' : 'ILIKE';

    const leads = await db.raw(`
      SELECT id, name as label, 'lead' as type, status, email
      FROM leads WHERE name ${likeOp} ? OR email ${likeOp} ? OR company ${likeOp} ?
      LIMIT 5
    `, [term, term, term]);

    const companies = await db.raw(`
      SELECT id, name as label, 'company' as type, segment as extra
      FROM companies WHERE name ${likeOp} ? OR email ${likeOp} ? OR cnpj ${likeOp} ?
      LIMIT 5
    `, [term, term, term]);

    const equipment = await db.raw(`
      SELECT id, name as label, 'equipment' as type, brand || ' ' || model as extra
      FROM equipment WHERE name ${likeOp} ? OR brand ${likeOp} ? OR plate ${likeOp} ?
      LIMIT 5
    `, [term, term, term]);

    const orders = await db.raw(`
      SELECT id, title as label, 'service_order' as type, status as extra
      FROM service_orders WHERE title ${likeOp} ? OR description ${likeOp} ?
      LIMIT 5
    `, [term, term]);

    const contracts = await db.raw(`
      SELECT id, title as label, 'contract' as type, status as extra
      FROM contracts WHERE title ${likeOp} ? OR notes ${likeOp} ?
      LIMIT 5
    `, [term, term]);

    return {
      results: [...leads, ...companies, ...equipment, ...orders, ...contracts],
      query: q,
    };
  });
}
