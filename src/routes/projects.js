import * as projectService from '../services/project-service.js';

export default async function (app) {
  app.get('/api/projects', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { page = 1, limit = 10, status, company_id } = req.query;
    return projectService.getAll({ page: parseInt(page), limit: parseInt(limit), status, company_id: company_id ? parseInt(company_id) : undefined });
  });

  app.post('/api/projects', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return projectService.create(req.body);
  });

  app.get('/api/projects/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const project = await projectService.getById(parseInt(req.params.id));
    if (!project) return reply.code(404).send({ error: 'Projeto não encontrado' });
    return project;
  });

  app.patch('/api/projects/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return projectService.update(parseInt(req.params.id), req.body);
  });

  app.delete('/api/projects/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = await projectService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Projeto não encontrado' });
    return { success: true };
  });

  app.post('/api/projects/:id/phases', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return projectService.addPhase(parseInt(req.params.id), req.body);
  });

  app.patch('/api/projects/phases/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return projectService.updatePhase(parseInt(req.params.id), req.body);
  });

  app.delete('/api/projects/phases/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = await projectService.deletePhase(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Fase não encontrada' });
    return { success: true };
  });
}
