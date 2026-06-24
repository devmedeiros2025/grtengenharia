import * as svc from '../services/contract-service.js';
import { createContractSchema, updateContractSchema } from '../validators/contract-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export async function contractRoutes(app) {
  app.get('/api/contracts', { preHandler: [app.requireAuth], schema: { tags: ['Contracts'], summary: 'Listar contratos', description: 'Retorna lista paginada de contratos' } }, async (request) => {
    return svc.listContracts(request.query);
  });

  app.get('/api/contracts/:id', { preHandler: [app.requireAuth], schema: { tags: ['Contracts'], summary: 'Obter contrato por ID', description: 'Retorna detalhes de um contrato específico' } }, async (request, reply) => {
    const item = await svc.getContract(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Contrato não encontrado' });
    return item;
  });

  app.post('/api/contracts', { preHandler: [app.requireAuth], schema: { tags: ['Contracts'], summary: 'Criar contrato', description: 'Adiciona um novo contrato' } }, async (request, reply) => {
    try {
      const data = createContractSchema.parse(request.body);
      const item = await svc.createContract(data);
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'contract', item.id, item.title, `Criou contrato ${item.title}`);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.patch('/api/contracts/:id', { preHandler: [app.requireAuth], schema: { tags: ['Contracts'], summary: 'Atualizar contrato', description: 'Atualiza dados de um contrato existente' } }, async (request, reply) => {
    try {
      const data = updateContractSchema.parse(request.body);
      const item = await svc.updateContract(Number(request.params.id), data);
      if (!item) return reply.code(404).send({ error: 'Contrato não encontrado' });
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'contract', item.id, item.title, `Atualizou contrato ${item.title}`);
      return item;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/contracts/:id', { preHandler: [app.requireAuth], schema: { tags: ['Contracts'], summary: 'Excluir contrato', description: 'Remove um contrato do sistema' } }, async (request, reply) => {
    const item = await svc.getContract(Number(request.params.id));
    const ok = await svc.deleteContract(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Contrato não encontrado' });
    const u = request.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'contract', request.params.id, item?.title, `Removeu contrato ${item?.title}`);
    return { ok: true };
  });
}
