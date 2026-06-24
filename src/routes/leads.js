import * as leadService from '../services/lead-service.js';
import { createLeadSchema, updateLeadSchema } from '../validators/lead-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { logActivity } from './users.js';

export async function leadRoutes(app) {
  // Listar leads
  app.get('/api/leads', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Listar leads', description: 'Retorna lista paginada de leads com filtros' },
  }, async (request) => {
    const { status, source, search, page, limit } = request.query;
    return leadService.listLeads({ status, source, search, page: Number(page) || 1, limit: Number(limit) || 50 });
  });

  // Obter lead por ID
  app.get('/api/leads/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Obter lead por ID', description: 'Retorna detalhes de um lead específico' },
  }, async (request) => {
    const lead = await leadService.getLeadById(Number(request.params.id));
    if (!lead) throw new NotFoundError('Lead não encontrado');
    return lead;
  });

  // Criar lead via API
  app.post('/api/leads', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Criar lead', description: 'Adiciona um novo lead ao sistema' },
  }, async (request, reply) => {
    try {
      const data = createLeadSchema.parse(request.body);
      const lead = await leadService.createLead(data);
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'lead', lead.id, lead.name, `Criou lead ${lead.name}`);
      return reply.code(201).send(lead);
    } catch (err) {
      handleValidationError(err);
    }
  });

  // Atualizar lead
  app.patch('/api/leads/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Atualizar lead', description: 'Atualiza dados de um lead existente' },
  }, async (request) => {
    try {
      const data = updateLeadSchema.parse(request.body);
      const lead = await leadService.updateLead(Number(request.params.id), data);
      if (!lead) throw new NotFoundError('Lead não encontrado');
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'lead', lead.id, lead.name, `Atualizou lead ${lead.name}`);
      return lead;
    } catch (err) {
      handleValidationError(err);
    }
  });

  // Deletar lead
  app.delete('/api/leads/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Excluir lead', description: 'Remove um lead do sistema' },
  }, async (request) => {
    const lead = await leadService.getLeadById(Number(request.params.id));
    if (!lead) throw new NotFoundError('Lead não encontrado');
    const ok = await leadService.deleteLead(Number(request.params.id));
    const u = request.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'lead', request.params.id, lead?.name, `Removeu lead ${lead?.name}`);
    return { ok: true };
  });

  // Estatísticas
  app.get('/api/leads/stats/summary', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Estatísticas de leads', description: 'Retorna resumo estatístico dos leads' },
  }, async () => {
    return leadService.getLeadsStats();
  });

  // ── Kanban ──────────────────────────────────────────────────────────────

  // Listar leads agrupados por status kanban
  app.get('/api/leads/kanban', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Kanban de leads', description: 'Retorna leads agrupados por status para o kanban' },
  }, async () => {
    return leadService.getLeadsKanban();
  });

  // Transição de status kanban com validação
  app.patch('/api/leads/:id/transition', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Transição de status', description: 'Move um lead para outro status no kanban' },
  }, async (request) => {
    const { status } = request.body || {};
    if (!status) throw new ValidationError('Campo "status" é obrigatório');
    const lead = await leadService.transitionLead(Number(request.params.id), status);
    return lead;
  });

  // SLA alerts
  app.get('/api/leads/sla-alerts', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Leads'], summary: 'Alertas SLA', description: 'Retorna alertas de SLA para leads' },
  }, async () => {
    return leadService.getSlaAlerts();
  });
}
