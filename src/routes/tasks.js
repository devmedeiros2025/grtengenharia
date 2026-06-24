import * as svc from '../services/task-service.js';
import { createTaskSchema, updateTaskSchema } from '../validators/task-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export async function taskRoutes(app) {
  // GET /api/tasks
  app.get('/api/tasks', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Tasks'], summary: 'Listar tarefas', description: 'Retorna lista paginada de tarefas' },
  }, async (request) => {
    return svc.listTasks(request.query);
  });

  // GET /api/tasks/stats
  app.get('/api/tasks/stats', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Tasks'], summary: 'Estatísticas de tarefas', description: 'Retorna resumo estatístico das tarefas' },
  }, async () => {
    return svc.getTaskStats();
  });

  // GET /api/tasks/:id
  app.get('/api/tasks/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Tasks'], summary: 'Obter tarefa por ID', description: 'Retorna detalhes de uma tarefa específica' },
  }, async (request, reply) => {
    const task = await svc.getTask(Number(request.params.id));
    if (!task) return reply.code(404).send({ error: 'Tarefa não encontrada' });
    return task;
  });

  // POST /api/tasks
  app.post('/api/tasks', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Tasks'], summary: 'Criar tarefa', description: 'Adiciona uma nova tarefa' },
  }, async (request, reply) => {
    try {
      const data = createTaskSchema.parse(request.body);
      const task = await svc.createTask(data);
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'task', task.id, task.title, `Criou tarefa ${task.title}`);
      return reply.code(201).send(task);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // PATCH /api/tasks/:id
  app.patch('/api/tasks/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Tasks'], summary: 'Atualizar tarefa', description: 'Atualiza dados de uma tarefa existente' },
  }, async (request, reply) => {
    try {
      const data = updateTaskSchema.parse(request.body);
      const task = await svc.updateTask(Number(request.params.id), data);
      if (!task) return reply.code(404).send({ error: 'Tarefa não encontrada' });
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'task', task.id, task.title, `Atualizou tarefa ${task.title}`);
      return task;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // DELETE /api/tasks/:id
  app.delete('/api/tasks/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Tasks'], summary: 'Excluir tarefa', description: 'Remove uma tarefa do sistema' },
  }, async (request, reply) => {
    const task = await svc.getTask(Number(request.params.id));
    const ok = await svc.deleteTask(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Tarefa não encontrada' });
    const u = request.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'task', request.params.id, task?.title, `Removeu tarefa ${task?.title}`);
    return { ok: true };
  });
}
