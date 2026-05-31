import * as leadService from '../services/lead-service.js';
import { createLeadSchema, updateLeadSchema } from '../validators/lead-validator.js';
import { ZodError } from 'zod';

function handleValidationError(err, reply) {
  if (err instanceof ZodError) {
    return reply.code(400).send({
      error: 'Dados inválidos',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }
  return reply.code(400).send({ error: err.message });
}

export async function leadRoutes(app) {
  // Listar leads
  app.get('/api/leads', {
    preHandler: [app.requireAuth],
  }, async (request) => {
    const { status, source, search, page, limit } = request.query;
    return leadService.listLeads({ status, source, search, page: Number(page) || 1, limit: Number(limit) || 50 });
  });

  // Obter lead por ID
  app.get('/api/leads/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const lead = leadService.getLeadById(Number(request.params.id));
    if (!lead) return reply.code(404).send({ error: 'Lead não encontrado' });
    return lead;
  });

  // Criar lead via API
  app.post('/api/leads', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = createLeadSchema.parse(request.body);
      const lead = leadService.createLead(data);
      return reply.code(201).send(lead);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Atualizar lead
  app.patch('/api/leads/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = updateLeadSchema.parse(request.body);
      const lead = leadService.updateLead(Number(request.params.id), data);
      if (!lead) return reply.code(404).send({ error: 'Lead não encontrado' });
      return lead;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Deletar lead
  app.delete('/api/leads/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const ok = leadService.deleteLead(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Lead não encontrado' });
    return { ok: true };
  });

  // Estatísticas
  app.get('/api/leads/stats/summary', {
    preHandler: [app.requireAuth],
  }, async () => {
    return leadService.getLeadsStats();
  });
}
