import * as svc from '../services/deal-service.js';
import { createDealSchema, updateDealSchema } from '../validators/deal-validator.js';
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

export async function dealRoutes(app) {
  // GET /api/deals
  app.get('/api/deals', {
    preHandler: [app.requireAuth],
  }, async (request) => {
    return svc.listDeals(request.query);
  });

  // GET /api/deals/stats
  app.get('/api/deals/stats', {
    preHandler: [app.requireAuth],
  }, async () => {
    return svc.getDealStats();
  });

  // GET /api/deals/stages
  app.get('/api/deals/stages', {
    preHandler: [app.requireAuth],
  }, async () => {
    return svc.listPipelineStages();
  });

  // GET /api/deals/:id
  app.get('/api/deals/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const deal = svc.getDeal(Number(request.params.id));
    if (!deal) return reply.code(404).send({ error: 'Negócio não encontrado' });
    return deal;
  });

  // POST /api/deals
  app.post('/api/deals', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = createDealSchema.parse(request.body);
      const deal = svc.createDeal(data);
      return reply.code(201).send(deal);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // PATCH /api/deals/:id
  app.patch('/api/deals/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = updateDealSchema.parse(request.body);
      const deal = svc.updateDeal(Number(request.params.id), data);
      if (!deal) return reply.code(404).send({ error: 'Negócio não encontrado' });
      return deal;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // DELETE /api/deals/:id
  app.delete('/api/deals/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const ok = svc.deleteDeal(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Negócio não encontrado' });
    return { ok: true };
  });
}
