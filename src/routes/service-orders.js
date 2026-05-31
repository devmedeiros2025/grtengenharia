import * as svc from '../services/service-order-service.js';

export async function serviceOrderRoutes(app) {
  app.get('/api/service-orders', { preHandler: [app.requireAuth] }, async (request) => {
    return svc.listServiceOrders(request.query);
  });

  app.get('/api/service-orders/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const item = await svc.getServiceOrder(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'OS não encontrada' });
    return item;
  });

  app.post('/api/service-orders', { preHandler: [app.requireAuth] }, async (request, reply) => {
    if (!request.body?.title) return reply.code(400).send({ error: 'Título é obrigatório' });
    const item = await svc.createServiceOrder(request.body);
    return reply.code(201).send(item);
  });

  app.patch('/api/service-orders/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const item = await svc.updateServiceOrder(Number(request.params.id), request.body);
    if (!item) return reply.code(404).send({ error: 'OS não encontrada' });
    return item;
  });

  app.delete('/api/service-orders/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const ok = await svc.deleteServiceOrder(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'OS não encontrada' });
    return { ok: true };
  });
}
