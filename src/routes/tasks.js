import * as svc from '../services/task-service.js';
import { createTaskSchema, updateTaskSchema } from '../validators/task-validator.js';
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

export async function taskRoutes(app) {
  // GET /api/tasks
  app.get('/api/tasks', {
    preHandler: [app.requireAuth],
  }, async (request) => {
    return svc.listTasks(request.query);
  });

  // GET /api/tasks/stats
  app.get('/api/tasks/stats', {
    preHandler: [app.requireAuth],
  }, async () => {
    return svc.getTaskStats();
  });

  // GET /api/tasks/:id
  app.get('/api/tasks/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const task = svc.getTask(Number(request.params.id));
    if (!task) return reply.code(404).send({ error: 'Tarefa não encontrada' });
    return task;
  });

  // POST /api/tasks
  app.post('/api/tasks', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = createTaskSchema.parse(request.body);
      const task = svc.createTask(data);
      return reply.code(201).send(task);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // PATCH /api/tasks/:id
  app.patch('/api/tasks/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = updateTaskSchema.parse(request.body);
      const task = svc.updateTask(Number(request.params.id), data);
      if (!task) return reply.code(404).send({ error: 'Tarefa não encontrada' });
      return task;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // DELETE /api/tasks/:id
  app.delete('/api/tasks/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const ok = svc.deleteTask(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Tarefa não encontrada' });
    return { ok: true };
  });
}
