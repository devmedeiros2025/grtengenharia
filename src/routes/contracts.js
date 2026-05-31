import * as svc from '../services/contract-service.js';

export async function contractRoutes(app) {
  app.get('/api/contracts', { preHandler: [app.requireAuth] }, async (request) => {
    return svc.listContracts(request.query);
  });

  app.get('/api/contracts/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const item = svc.getContract(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Contrato não encontrado' });
    return item;
  });

  app.post('/api/contracts', { preHandler: [app.requireAuth] }, async (request, reply) => {
    if (!request.body?.title) return reply.code(400).send({ error: 'Título é obrigatório' });
    const item = svc.createContract(request.body);
    return reply.code(201).send(item);
  });

  app.patch('/api/contracts/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const item = svc.updateContract(Number(request.params.id), request.body);
    if (!item) return reply.code(404).send({ error: 'Contrato não encontrado' });
    return item;
  });

  app.delete('/api/contracts/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const ok = svc.deleteContract(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Contrato não encontrado' });
    return { ok: true };
  });
}
