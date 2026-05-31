import * as hunterService from '../services/hunter-service.js';

export default async function (app) {
  app.get('/api/hunter/enrichments', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { page = 1, limit = 10, source, lead_id } = req.query;
    return hunterService.getAllEnrichments({ page: parseInt(page), limit: parseInt(limit), source, lead_id: lead_id ? parseInt(lead_id) : undefined });
  });

  app.post('/api/hunter/enrichments', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return hunterService.addEnrichment(req.body);
  });

  app.get('/api/hunter/enrichments/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const enrichment = await hunterService.getEnrichmentById(parseInt(req.params.id));
    if (!enrichment) return reply.code(404).send({ error: 'Enriquecimento não encontrado' });
    return enrichment;
  });

  app.delete('/api/hunter/enrichments/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = await hunterService.removeEnrichment(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Enriquecimento não encontrado' });
    return { success: true };
  });

  app.get('/api/hunter/lead-score/:lead_id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return hunterService.getLeadScore(parseInt(req.params.lead_id));
  });

  app.get('/api/hunter/top-leads', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const limit = parseInt(req.query.limit) || 10;
    return hunterService.getTopLeads(limit);
  });
}
