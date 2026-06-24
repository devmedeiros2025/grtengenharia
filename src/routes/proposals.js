import * as proposalService from '../services/proposal-service.js';
import { createProposalSchema, updateProposalSchema } from '../validators/proposal-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export default async function (app) {
  app.get('/api/proposals', { preHandler: [app.requireAuth], schema: { tags: ['Proposals'], summary: 'Listar propostas', description: 'Retorna lista paginada de propostas' } }, async (req, reply) => {
    const { page = 1, limit = 10, status, company_id } = req.query;
    return proposalService.getAll({ page: parseInt(page), limit: parseInt(limit), status, company_id: company_id ? parseInt(company_id) : undefined });
  });

  app.post('/api/proposals', { preHandler: [app.requireAuth], schema: { tags: ['Proposals'], summary: 'Criar proposta', description: 'Adiciona uma nova proposta comercial' } }, async (req, reply) => {
    try {
      const data = createProposalSchema.parse(req.body);
      const proposal = await proposalService.create(data);
      const u = req.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'proposal', proposal.id, proposal.title, `Criou proposta ${proposal.title}`);
      return reply.code(201).send(proposal);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.get('/api/proposals/:id', { preHandler: [app.requireAuth], schema: { tags: ['Proposals'], summary: 'Obter proposta por ID', description: 'Retorna detalhes de uma proposta específica' } }, async (req, reply) => {
    const proposal = await proposalService.getById(parseInt(req.params.id));
    if (!proposal) return reply.code(404).send({ error: 'Proposta não encontrada' });
    return proposal;
  });

  app.patch('/api/proposals/:id', { preHandler: [app.requireAuth], schema: { tags: ['Proposals'], summary: 'Atualizar proposta', description: 'Atualiza dados de uma proposta existente' } }, async (req, reply) => {
    try {
      const data = updateProposalSchema.parse(req.body);
      const proposal = await proposalService.update(parseInt(req.params.id), data);
      if (!proposal) return reply.code(404).send({ error: 'Proposta não encontrada' });
      const u = req.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'proposal', proposal.id, proposal.title, `Atualizou proposta ${proposal.title}`);
      return proposal;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/proposals/:id', { preHandler: [app.requireAuth], schema: { tags: ['Proposals'], summary: 'Excluir proposta', description: 'Remove uma proposta' } }, async (req, reply) => {
    const proposal = await proposalService.getById(parseInt(req.params.id));
    const deleted = await proposalService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Proposta não encontrada' });
    const u = req.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'proposal', req.params.id, proposal?.title, `Removeu proposta ${proposal?.title}`);
    return { success: true };
  });
}
