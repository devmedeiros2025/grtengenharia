import * as proposalService from '../services/proposal-service.js';

export default async function (app) {
  app.get('/api/proposals', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { page = 1, limit = 10, status, company_id } = req.query;
    return proposalService.getAll({ page: parseInt(page), limit: parseInt(limit), status, company_id: company_id ? parseInt(company_id) : undefined });
  });

  app.post('/api/proposals', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return proposalService.create(req.body);
  });

  app.get('/api/proposals/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const proposal = proposalService.getById(parseInt(req.params.id));
    if (!proposal) return reply.code(404).send({ error: 'Proposta não encontrada' });
    return proposal;
  });

  app.patch('/api/proposals/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return proposalService.update(parseInt(req.params.id), req.body);
  });

  app.delete('/api/proposals/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = proposalService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Proposta não encontrada' });
    return { success: true };
  });
}
