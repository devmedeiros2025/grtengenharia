import * as svc from '../services/daily-routine-service.js';
import { createDailyRoutineSchema, updateDailyRoutineSchema } from '../validators/daily-routine-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';

export async function dailyRoutineRoutes(app) {
  // GET /api/daily-routines
  app.get('/api/daily-routines', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Daily Routines'], summary: 'Listar rotinas diárias', description: 'Retorna lista paginada de rotinas diárias' },
  }, async (request) => {
    return svc.listDailyRoutines(request.query);
  });

  // GET /api/daily-routines/stats
  app.get('/api/daily-routines/stats', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Daily Routines'], summary: 'Estatísticas de rotinas', description: 'Retorna resumo estatístico das rotinas diárias' },
  }, async () => {
    return svc.getDailyRoutineStats();
  });

  // GET /api/daily-routines/:id
  app.get('/api/daily-routines/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Daily Routines'], summary: 'Obter rotina por ID', description: 'Retorna detalhes de uma rotina diária específica' },
  }, async (request, reply) => {
    const item = await svc.getDailyRoutine(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Rotina não encontrada' });
    return item;
  });

  // POST /api/daily-routines
  app.post('/api/daily-routines', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Daily Routines'], summary: 'Criar rotina', description: 'Adiciona uma nova rotina diária' },
  }, async (request, reply) => {
    try {
      const data = createDailyRoutineSchema.parse(request.body);
      const item = await svc.createDailyRoutine(data);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // PATCH /api/daily-routines/:id
  app.patch('/api/daily-routines/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Daily Routines'], summary: 'Atualizar rotina', description: 'Atualiza dados de uma rotina diária existente' },
  }, async (request, reply) => {
    try {
      const data = updateDailyRoutineSchema.parse(request.body);
      const item = await svc.updateDailyRoutine(Number(request.params.id), data);
      if (!item) return reply.code(404).send({ error: 'Rotina não encontrada' });
      return item;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // DELETE /api/daily-routines/:id
  app.delete('/api/daily-routines/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Daily Routines'], summary: 'Excluir rotina', description: 'Remove uma rotina diária do sistema' },
  }, async (request, reply) => {
    const ok = await svc.deleteDailyRoutine(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Rotina não encontrada' });
    return { ok: true };
  });
}
