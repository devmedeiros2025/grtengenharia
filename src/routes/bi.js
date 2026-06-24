import * as biService from '../services/bi-service.js';

export default async function (app) {
  app.get('/api/bi/kpis', { preHandler: [app.requireAuth], schema: { tags: ['BI'], summary: 'KPIs do negocio', description: 'Retorna indicadores-chave de performance' } }, async (req, reply) => {
    const [conversion, avgTicket, fleet, counts] = await Promise.all([
      biService.getConversionRate(),
      biService.getAverageTicket(),
      biService.getFleetUtilization(),
      biService.getTotalCounts(),
    ]);
    return { ...conversion, ...avgTicket, ...fleet, ...counts };
  });

  app.get('/api/bi/leads-by-source', { preHandler: [app.requireAuth], schema: { tags: ['BI'], summary: 'Leads por fonte', description: 'Retorna distribuicao de leads por origem' } }, async (req, reply) => {
    return biService.getLeadsBySource();
  });

  app.get('/api/bi/deals-by-month', { preHandler: [app.requireAuth], schema: { tags: ['BI'], summary: 'Negocios por mes', description: 'Retorna evolucao mensal de negocios' } }, async (req, reply) => {
    return biService.getDealsByMonth();
  });

  app.get('/api/bi/top-clients', { preHandler: [app.requireAuth], schema: { tags: ['BI'], summary: 'Top clientes', description: 'Retorna os clientes com mais negocios' } }, async (req, reply) => {
    const limit = parseInt(req.query.limit) || 5;
    return biService.getTopClients(limit);
  });
}
