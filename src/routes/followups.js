import * as followupService from '../services/followup-service.js';

export default async function (app) {
  app.get('/api/followups', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { page = 1, limit = 10, status, lead_id, user_id } = req.query;
    return followupService.getAll({ page: parseInt(page), limit: parseInt(limit), status, lead_id: lead_id ? parseInt(lead_id) : undefined, user_id: user_id ? parseInt(user_id) : undefined });
  });

  app.post('/api/followups', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return followupService.create(req.body);
  });

  app.get('/api/followups/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const followup = followupService.getById(parseInt(req.params.id));
    if (!followup) return reply.code(404).send({ error: 'Acompanhamento não encontrado' });
    return followup;
  });

  app.patch('/api/followups/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return followupService.update(parseInt(req.params.id), req.body);
  });

  app.delete('/api/followups/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = followupService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Acompanhamento não encontrado' });
    return { success: true };
  });

  app.get('/api/followups/overdue/list', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return followupService.getOverdue();
  });

  app.patch('/api/followups/:id/complete', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return followupService.complete(parseInt(req.params.id));
  });
}
