import * as projectService from '../services/project-service.js';
import { createProjectSchema, updateProjectSchema, createPhaseSchema, updatePhaseSchema } from '../validators/project-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export default async function (app) {
  app.get('/api/projects', { preHandler: [app.requireAuth], schema: { tags: ['Projects'], summary: 'Listar projetos', description: 'Retorna lista paginada de projetos' } }, async (req, reply) => {
    const { page = 1, limit = 10, status, company_id } = req.query;
    return projectService.getAll({ page: parseInt(page), limit: parseInt(limit), status, company_id: company_id ? parseInt(company_id) : undefined });
  });

  app.post('/api/projects', { preHandler: [app.requireAuth], schema: { tags: ['Projects'], summary: 'Criar projeto', description: 'Adiciona um novo projeto/obra' } }, async (req, reply) => {
    try {
      const data = createProjectSchema.parse(req.body);
      const project = await projectService.create({
        name: data.title,
        company_id: data.company_id,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        value: data.value,
        notes: data.notes,
      });
      const u = req.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'project', project.id, project.name, `Criou projeto ${project.name}`);
      return reply.code(201).send(project);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.get('/api/projects/:id', { preHandler: [app.requireAuth], schema: { tags: ['Projects'], summary: 'Obter projeto por ID', description: 'Retorna detalhes de um projeto específico' } }, async (req, reply) => {
    const project = await projectService.getById(parseInt(req.params.id));
    if (!project) return reply.code(404).send({ error: 'Projeto não encontrado' });
    return project;
  });

  app.patch('/api/projects/:id', { preHandler: [app.requireAuth], schema: { tags: ['Projects'], summary: 'Atualizar projeto', description: 'Atualiza dados de um projeto existente' } }, async (req, reply) => {
    try {
      const data = updateProjectSchema.parse(req.body);
      const updateData = { ...data };
      if (updateData.title !== undefined) {
        updateData.name = updateData.title;
        delete updateData.title;
      }
      const project = await projectService.update(parseInt(req.params.id), updateData);
      if (!project) return reply.code(404).send({ error: 'Projeto não encontrado' });
      const u = req.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'project', project.id, project.name, `Atualizou projeto ${project.name}`);
      return project;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/projects/:id', { preHandler: [app.requireAuth], schema: { tags: ['Projects'], summary: 'Excluir projeto', description: 'Remove um projeto' } }, async (req, reply) => {
    const project = await projectService.getById(parseInt(req.params.id));
    const deleted = await projectService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Projeto não encontrado' });
    const u = req.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'project', req.params.id, project?.name, `Removeu projeto ${project?.name}`);
    return { success: true };
  });

  app.post('/api/projects/:id/phases', { preHandler: [app.requireAuth], schema: { tags: ['Projects'], summary: 'Adicionar fase', description: 'Adiciona uma nova fase a um projeto' } }, async (req, reply) => {
    try {
      const data = createPhaseSchema.parse(req.body);
      const phase = await projectService.addPhase(parseInt(req.params.id), data);
      const u = req.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'project_phase', phase.id, phase.name, `Criou fase ${phase.name} no projeto #${req.params.id}`);
      return reply.code(201).send(phase);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.patch('/api/projects/phases/:id', { preHandler: [app.requireAuth], schema: { tags: ['Projects'], summary: 'Atualizar fase', description: 'Atualiza dados de uma fase de projeto' } }, async (req, reply) => {
    try {
      const data = updatePhaseSchema.parse(req.body);
      const phase = await projectService.updatePhase(parseInt(req.params.id), data);
      if (!phase) return reply.code(404).send({ error: 'Fase não encontrada' });
      const u = req.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'project_phase', req.params.id, phase?.name, `Atualizou fase ${phase?.name}`);
      return phase;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/projects/phases/:id', { preHandler: [app.requireAuth], schema: { tags: ['Projects'], summary: 'Excluir fase', description: 'Remove uma fase de projeto' } }, async (req, reply) => {
    const deleted = await projectService.deletePhase(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Fase não encontrada' });
    const u = req.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'project_phase', req.params.id, null, `Removeu fase #${req.params.id}`);
    return { success: true };
  });
}
