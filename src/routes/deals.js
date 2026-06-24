import * as svc from '../services/deal-service.js';
import { createDealSchema, updateDealSchema } from '../validators/deal-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export async function dealRoutes(app) {
  // GET /api/deals
  app.get('/api/deals', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Deals'], summary: 'Listar negócios', description: 'Retorna lista paginada de negócios' },
  }, async (request) => {
    return svc.listDeals(request.query);
  });

  // GET /api/deals/stats
  app.get('/api/deals/stats', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Deals'], summary: 'Estatísticas de negócios', description: 'Retorna resumo estatístico dos negócios' },
  }, async () => {
    return svc.getDealStats();
  });

  // GET /api/deals/stages
  app.get('/api/deals/stages', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Deals'], summary: 'Listar estágios do pipeline', description: 'Retorna os estágios/configurações do pipeline' },
  }, async () => {
    return svc.listPipelineStages();
  });

  // GET /api/deals/:id
  app.get('/api/deals/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Deals'], summary: 'Obter negócio por ID', description: 'Retorna detalhes de um negócio específico' },
  }, async (request, reply) => {
    const deal = await svc.getDeal(Number(request.params.id));
    if (!deal) return reply.code(404).send({ error: 'Negócio não encontrado' });
    return deal;
  });

  // POST /api/deals
  app.post('/api/deals', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Deals'], summary: 'Criar negócio', description: 'Adiciona um novo negócio ao pipeline' },
  }, async (request, reply) => {
    try {
      const data = createDealSchema.parse(request.body);
      const deal = await svc.createDeal(data);
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'deal', deal.id, deal.title, `Criou negócio ${deal.title}`);
      return reply.code(201).send(deal);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // PATCH /api/deals/:id
  app.patch('/api/deals/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Deals'], summary: 'Atualizar negócio', description: 'Atualiza dados de um negócio existente' },
  }, async (request, reply) => {
    try {
      const data = updateDealSchema.parse(request.body);
      const deal = await svc.updateDeal(Number(request.params.id), data);
      if (!deal) return reply.code(404).send({ error: 'Negócio não encontrado' });
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'deal', deal.id, deal.title, `Atualizou negócio ${deal.title}`);
      return deal;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // DELETE /api/deals/:id
  app.delete('/api/deals/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Deals'], summary: 'Excluir negócio', description: 'Remove um negócio do pipeline' },
  }, async (request, reply) => {
    const deal = await svc.getDeal(Number(request.params.id));
    const ok = await svc.deleteDeal(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Negócio não encontrado' });
    const u = request.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'deal', request.params.id, deal?.title, `Removeu negócio ${deal?.title}`);
    return { ok: true };
  });
}
