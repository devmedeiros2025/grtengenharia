import * as campaignService from '../services/campaign-service.js';

export default async function (app) {
  app.get('/api/campaigns', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { page = 1, limit = 10, status, type } = req.query;
    return campaignService.getAll({ page: parseInt(page), limit: parseInt(limit), status, type });
  });

  app.post('/api/campaigns', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return campaignService.create(req.body);
  });

  app.get('/api/campaigns/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const campaign = campaignService.getById(parseInt(req.params.id));
    if (!campaign) return reply.code(404).send({ error: 'Campanha não encontrada' });
    return campaign;
  });

  app.patch('/api/campaigns/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return campaignService.update(parseInt(req.params.id), req.body);
  });

  app.delete('/api/campaigns/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = campaignService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Campanha não encontrada' });
    return { success: true };
  });

  app.post('/api/campaigns/:id/targets', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return campaignService.addTarget(parseInt(req.params.id), req.body);
  });

  app.delete('/api/campaigns/targets/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = campaignService.removeTarget(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Alvo não encontrado' });
    return { success: true };
  });
}
