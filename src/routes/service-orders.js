import * as svc from '../services/service-order-service.js';
import { createServiceOrderSchema, updateServiceOrderSchema } from '../validators/service-order-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export async function serviceOrderRoutes(app) {
  app.get('/api/service-orders', { preHandler: [app.requireAuth], schema: { tags: ['Service Orders'], summary: 'Listar ordens de serviço', description: 'Retorna lista paginada de ordens de serviço' } }, async (request) => {
    return svc.listServiceOrders(request.query);
  });

  app.get('/api/service-orders/:id', { preHandler: [app.requireAuth], schema: { tags: ['Service Orders'], summary: 'Obter OS por ID', description: 'Retorna detalhes de uma ordem de serviço' } }, async (request, reply) => {
    const item = await svc.getServiceOrder(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'OS não encontrada' });
    return item;
  });

  app.post('/api/service-orders', { preHandler: [app.requireAuth], schema: { tags: ['Service Orders'], summary: 'Criar OS', description: 'Cria uma nova ordem de serviço' } }, async (request, reply) => {
    try {
      const data = createServiceOrderSchema.parse(request.body);
      const item = await svc.createServiceOrder(data);
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'service_order', item.id, item.title, `Criou OS ${item.title}`);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.patch('/api/service-orders/:id', { preHandler: [app.requireAuth], schema: { tags: ['Service Orders'], summary: 'Atualizar OS', description: 'Atualiza dados de uma ordem de serviço' } }, async (request, reply) => {
    try {
      const data = updateServiceOrderSchema.parse(request.body);
      const item = await svc.updateServiceOrder(Number(request.params.id), data);
      if (!item) return reply.code(404).send({ error: 'OS não encontrada' });
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'service_order', item.id, item.title, `Atualizou OS ${item.title}`);
      return item;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/service-orders/:id', { preHandler: [app.requireAuth], schema: { tags: ['Service Orders'], summary: 'Excluir OS', description: 'Remove uma ordem de serviço' } }, async (request, reply) => {
    const item = await svc.getServiceOrder(Number(request.params.id));
    const ok = await svc.deleteServiceOrder(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'OS não encontrada' });
    const u = request.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'service_order', Number(request.params.id), item?.title || '', `Excluiu OS ${item?.title || ''}`);
    return { ok: true };
  });
}
