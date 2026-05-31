import * as svc from '../services/daily-routine-service.js';
import { createDailyRoutineSchema, updateDailyRoutineSchema } from '../validators/daily-routine-validator.js';
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

export async function dailyRoutineRoutes(app) {
  // GET /api/daily-routines
  app.get('/api/daily-routines', {
    preHandler: [app.requireAuth],
  }, async (request) => {
    return svc.listDailyRoutines(request.query);
  });

  // GET /api/daily-routines/stats
  app.get('/api/daily-routines/stats', {
    preHandler: [app.requireAuth],
  }, async () => {
    return svc.getDailyRoutineStats();
  });

  // GET /api/daily-routines/:id
  app.get('/api/daily-routines/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const item = await svc.getDailyRoutine(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Rotina não encontrada' });
    return item;
  });

  // POST /api/daily-routines
  app.post('/api/daily-routines', {
    preHandler: [app.requireAuth],
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
  }, async (request, reply) => {
    const ok = await svc.deleteDailyRoutine(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Rotina não encontrada' });
    return { ok: true };
  });
}
