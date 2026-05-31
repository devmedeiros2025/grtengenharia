import * as ticketService from '../services/ticket-service.js';

export default async function (app) {
  app.get('/api/tickets', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { page = 1, limit = 10, status, priority, category } = req.query;
    return ticketService.getAll({ page: parseInt(page), limit: parseInt(limit), status, priority, category });
  });

  app.post('/api/tickets', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return ticketService.create(req.body);
  });

  app.get('/api/tickets/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const ticket = await ticketService.getById(parseInt(req.params.id));
    if (!ticket) return reply.code(404).send({ error: 'Chamado não encontrado' });
    return ticket;
  });

  app.patch('/api/tickets/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return ticketService.update(parseInt(req.params.id), req.body);
  });

  app.delete('/api/tickets/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = await ticketService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Chamado não encontrado' });
    return { success: true };
  });

  app.post('/api/tickets/:id/messages', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return ticketService.addMessage(parseInt(req.params.id), req.body);
  });

  app.get('/api/tickets/sla/stats', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return ticketService.getSlaStats();
  });
}
