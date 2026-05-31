import * as biService from '../services/bi-service.js';

export default async function (app) {
  app.get('/api/bi/kpis', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const conversion = biService.getConversionRate();
    const avgTicket = biService.getAverageTicket();
    const fleet = biService.getFleetUtilization();
    const counts = biService.getTotalCounts();
    return { ...conversion, ...avgTicket, ...fleet, ...counts };
  });

  app.get('/api/bi/leads-by-source', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return biService.getLeadsBySource();
  });

  app.get('/api/bi/deals-by-month', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return biService.getDealsByMonth();
  });

  app.get('/api/bi/top-clients', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const limit = parseInt(req.query.limit) || 5;
    return biService.getTopClients(limit);
  });
}
