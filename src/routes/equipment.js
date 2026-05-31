import * as svc from '../services/equipment-service.js';

export async function equipmentRoutes(app) {
  app.get('/api/equipment', { preHandler: [app.requireAuth] }, async (request) => {
    return svc.listEquipment(request.query);
  });

  app.get('/api/equipment/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const item = svc.getEquipment(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Equipamento não encontrado' });
    return item;
  });

  app.post('/api/equipment', { preHandler: [app.requireAuth] }, async (request, reply) => {
    if (!request.body?.name) return reply.code(400).send({ error: 'Nome é obrigatório' });
    const item = svc.createEquipment(request.body);
    return reply.code(201).send(item);
  });

  app.patch('/api/equipment/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const item = svc.updateEquipment(Number(request.params.id), request.body);
    if (!item) return reply.code(404).send({ error: 'Equipamento não encontrado' });
    return item;
  });

  app.delete('/api/equipment/:id', { preHandler: [app.requireAuth] }, async (request, reply) => {
    const ok = svc.deleteEquipment(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Equipamento não encontrado' });
    return { ok: true };
  });
}
