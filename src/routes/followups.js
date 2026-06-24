import * as followupService from '../services/followup-service.js';
import { createFollowupSchema, updateFollowupSchema, followupQuerySchema } from '../validators/followup-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';

export default async function (app) {
  app.get('/api/followups', { preHandler: [app.requireAuth], schema: { tags: ['Follow-ups'], summary: 'Listar follow-ups', description: 'Retorna lista paginada de acompanhamentos' } }, async (req, reply) => {
    try {
      const query = followupQuerySchema.parse(req.query);
      return followupService.getAll(query);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.post('/api/followups', { preHandler: [app.requireAuth], schema: { tags: ['Follow-ups'], summary: 'Criar follow-up', description: 'Adiciona um novo acompanhamento' } }, async (req, reply) => {
    try {
      const data = createFollowupSchema.parse(req.body);
      return followupService.create(data);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.get('/api/followups/:id', { preHandler: [app.requireAuth], schema: { tags: ['Follow-ups'], summary: 'Obter follow-up por ID', description: 'Retorna detalhes de um acompanhamento específico' } }, async (req, reply) => {
    const followup = await followupService.getById(parseInt(req.params.id));
    if (!followup) return reply.code(404).send({ error: 'Acompanhamento não encontrado' });
    return followup;
  });

  app.patch('/api/followups/:id', { preHandler: [app.requireAuth], schema: { tags: ['Follow-ups'], summary: 'Atualizar follow-up', description: 'Atualiza dados de um acompanhamento existente' } }, async (req, reply) => {
    try {
      const data = updateFollowupSchema.parse(req.body);
      const result = await followupService.update(parseInt(req.params.id), data);
      if (!result) return reply.code(404).send({ error: 'Acompanhamento não encontrado' });
      return result;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/followups/:id', { preHandler: [app.requireAuth], schema: { tags: ['Follow-ups'], summary: 'Excluir follow-up', description: 'Remove um acompanhamento do sistema' } }, async (req, reply) => {
    const deleted = await followupService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Acompanhamento não encontrado' });
    return { success: true };
  });

  app.get('/api/followups/overdue/list', { preHandler: [app.requireAuth], schema: { tags: ['Follow-ups'], summary: 'Follow-ups atrasados', description: 'Retorna lista de acompanhamentos em atraso' } }, async (req, reply) => {
    return followupService.getOverdue();
  });

  app.patch('/api/followups/:id/complete', { preHandler: [app.requireAuth], schema: { tags: ['Follow-ups'], summary: 'Concluir follow-up', description: 'Marca um acompanhamento como concluído' } }, async (req, reply) => {
    const result = await followupService.complete(parseInt(req.params.id));
    if (!result) return reply.code(404).send({ error: 'Acompanhamento não encontrado' });
    return result;
  });
}
