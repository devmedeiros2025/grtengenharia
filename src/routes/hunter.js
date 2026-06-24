import * as hunterService from '../services/hunter-service.js';
import { createEnrichmentSchema, queryEnrichmentsSchema as enrichmentQuerySchema } from '../validators/hunter-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';

export default async function (app) {
  app.get('/api/hunter/enrichments', { preHandler: [app.requireAuth], schema: { tags: ['Hunter'], summary: 'Listar enriquecimentos', description: 'Retorna lista paginada de enriquecimentos Hunter' } }, async (req, reply) => {
    try {
      const query = enrichmentQuerySchema.parse(req.query);
      return hunterService.getAllEnrichments(query);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.post('/api/hunter/enrichments', { preHandler: [app.requireAuth], schema: { tags: ['Hunter'], summary: 'Adicionar enriquecimento', description: 'Adiciona um novo enriquecimento de lead' } }, async (req, reply) => {
    try {
      const data = createEnrichmentSchema.parse(req.body);
      return hunterService.addEnrichment(data);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.get('/api/hunter/enrichments/:id', { preHandler: [app.requireAuth], schema: { tags: ['Hunter'], summary: 'Obter enriquecimento por ID', description: 'Retorna detalhes de um enriquecimento específico' } }, async (req, reply) => {
    const enrichment = await hunterService.getEnrichmentById(parseInt(req.params.id));
    if (!enrichment) return reply.code(404).send({ error: 'Enriquecimento não encontrado' });
    return enrichment;
  });

  app.delete('/api/hunter/enrichments/:id', { preHandler: [app.requireAuth], schema: { tags: ['Hunter'], summary: 'Excluir enriquecimento', description: 'Remove um enriquecimento do sistema' } }, async (req, reply) => {
    const deleted = await hunterService.removeEnrichment(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Enriquecimento não encontrado' });
    return { success: true };
  });

  app.get('/api/hunter/lead-score/:lead_id', { preHandler: [app.requireAuth], schema: { tags: ['Hunter'], summary: 'Score de lead', description: 'Retorna o score de um lead calculado pelo Hunter' } }, async (req, reply) => {
    return hunterService.getLeadScore(parseInt(req.params.lead_id));
  });

  app.get('/api/hunter/top-leads', { preHandler: [app.requireAuth], schema: { tags: ['Hunter'], summary: 'Top leads', description: 'Retorna os leads com maior score' } }, async (req, reply) => {
    const limit = parseInt(req.query.limit) || 10;
    return hunterService.getTopLeads(limit);
  });
}
