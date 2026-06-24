import * as svc from '../services/equipment-service.js';
import { createEquipmentSchema, updateEquipmentSchema } from '../validators/equipment-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export async function equipmentRoutes(app) {
  app.get('/api/equipment', { preHandler: [app.requireAuth], schema: { tags: ['Equipment'], summary: 'Listar equipamentos', description: 'Retorna lista paginada de equipamentos da frota' } }, async (request) => {
    return svc.listEquipment(request.query);
  });

  app.get('/api/equipment/:id', { preHandler: [app.requireAuth], schema: { tags: ['Equipment'], summary: 'Obter equipamento por ID', description: 'Retorna detalhes de um equipamento específico' } }, async (request, reply) => {
    const item = await svc.getEquipment(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Equipamento não encontrado' });
    return item;
  });

  app.post('/api/equipment', { preHandler: [app.requireAuth], schema: { tags: ['Equipment'], summary: 'Criar equipamento', description: 'Adiciona um novo equipamento à frota' } }, async (request, reply) => {
    try {
      const data = createEquipmentSchema.parse(request.body);
      const item = await svc.createEquipment(data);
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'equipment', item.id, item.name, `Criou equipamento ${item.name}`);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.patch('/api/equipment/:id', { preHandler: [app.requireAuth], schema: { tags: ['Equipment'], summary: 'Atualizar equipamento', description: 'Atualiza dados de um equipamento existente' } }, async (request, reply) => {
    try {
      const data = updateEquipmentSchema.parse(request.body);
      const item = await svc.updateEquipment(Number(request.params.id), data);
      if (!item) return reply.code(404).send({ error: 'Equipamento não encontrado' });
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'equipment', item.id, item.name, `Atualizou equipamento ${item.name}`);
      return item;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/equipment/:id', { preHandler: [app.requireAuth], schema: { tags: ['Equipment'], summary: 'Excluir equipamento', description: 'Remove um equipamento da frota' } }, async (request, reply) => {
    const item = await svc.getEquipment(Number(request.params.id));
    const ok = await svc.deleteEquipment(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Equipamento não encontrado' });
    const u = request.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'equipment', request.params.id, item?.name, `Removeu equipamento ${item?.name}`);
    return { ok: true };
  });
}
