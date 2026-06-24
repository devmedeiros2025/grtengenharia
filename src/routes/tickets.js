import * as ticketService from '../services/ticket-service.js';

export default async function (app) {
  app.get('/api/tickets', { preHandler: [app.requireAuth], schema: { tags: ['Tickets'], summary: 'Listar chamados', description: 'Retorna lista paginada de chamados/suporte' } }, async (req, reply) => {
    const { page = 1, limit = 10, status, priority, category } = req.query;
    return ticketService.getAll({ page: parseInt(page), limit: parseInt(limit), status, priority, category });
  });

  app.post('/api/tickets', { preHandler: [app.requireAuth], schema: { tags: ['Tickets'], summary: 'Criar chamado', description: 'Adiciona um novo chamado de suporte' } }, async (req, reply) => {
    return ticketService.create(req.body);
  });

  app.get('/api/tickets/:id', { preHandler: [app.requireAuth], schema: { tags: ['Tickets'], summary: 'Obter chamado por ID', description: 'Retorna detalhes de um chamado especifico' } }, async (req, reply) => {
    const ticket = await ticketService.getById(parseInt(req.params.id));
    if (!ticket) return reply.code(404).send({ error: 'Chamado não encontrado' });
    return ticket;
  });

  app.patch('/api/tickets/:id', { preHandler: [app.requireAuth], schema: { tags: ['Tickets'], summary: 'Atualizar chamado', description: 'Atualiza dados de um chamado existente' } }, async (req, reply) => {
    return ticketService.update(parseInt(req.params.id), req.body);
  });

  app.delete('/api/tickets/:id', { preHandler: [app.requireAuth], schema: { tags: ['Tickets'], summary: 'Excluir chamado', description: 'Remove um chamado do sistema' } }, async (req, reply) => {
    const deleted = await ticketService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Chamado não encontrado' });
    return { success: true };
  });

  app.post('/api/tickets/:id/messages', { preHandler: [app.requireAuth], schema: { tags: ['Tickets'], summary: 'Adicionar mensagem', description: 'Adiciona uma mensagem a um chamado' } }, async (req, reply) => {
    return ticketService.addMessage(parseInt(req.params.id), req.body);
  });

  app.get('/api/tickets/sla/stats', { preHandler: [app.requireAuth], schema: { tags: ['Tickets'], summary: 'Estatisticas SLA', description: 'Retorna metricas de SLA dos chamados' } }, async (req, reply) => {
    return ticketService.getSlaStats();
  });
}
