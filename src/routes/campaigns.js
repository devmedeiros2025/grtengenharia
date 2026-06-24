import * as campaignService from '../services/campaign-service.js';
import { createCampaignSchema, updateCampaignSchema, campaignQuerySchema, addTargetSchema } from '../validators/campaign-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';

export default async function (app) {
  app.get('/api/campaigns', { preHandler: [app.requireAuth], schema: { tags: ['Campaigns'], summary: 'Listar campanhas', description: 'Retorna lista paginada de campanhas' } }, async (req, reply) => {
    try {
      const query = campaignQuerySchema.parse(req.query);
      return campaignService.getAll(query);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.post('/api/campaigns', { preHandler: [app.requireAuth], schema: { tags: ['Campaigns'], summary: 'Criar campanha', description: 'Adiciona uma nova campanha' } }, async (req, reply) => {
    try {
      const data = createCampaignSchema.parse(req.body);
      return campaignService.create(data);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.get('/api/campaigns/:id', { preHandler: [app.requireAuth], schema: { tags: ['Campaigns'], summary: 'Obter campanha por ID', description: 'Retorna detalhes de uma campanha especifica' } }, async (req, reply) => {
    const campaign = await campaignService.getById(parseInt(req.params.id));
    if (!campaign) return reply.code(404).send({ error: 'Campanha não encontrada' });
    return campaign;
  });

  app.patch('/api/campaigns/:id', { preHandler: [app.requireAuth], schema: { tags: ['Campaigns'], summary: 'Atualizar campanha', description: 'Atualiza dados de uma campanha existente' } }, async (req, reply) => {
    try {
      const data = updateCampaignSchema.parse(req.body);
      const result = await campaignService.update(parseInt(req.params.id), data);
      if (!result) return reply.code(404).send({ error: 'Campanha não encontrada' });
      return result;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/campaigns/:id', { preHandler: [app.requireAuth], schema: { tags: ['Campaigns'], summary: 'Excluir campanha', description: 'Remove uma campanha do sistema' } }, async (req, reply) => {
    const deleted = await campaignService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Campanha não encontrada' });
    return { success: true };
  });

  app.post('/api/campaigns/:id/targets', { preHandler: [app.requireAuth], schema: { tags: ['Campaigns'], summary: 'Adicionar alvo', description: 'Adiciona um alvo a uma campanha' } }, async (req, reply) => {
    try {
      const data = addTargetSchema.parse(req.body);
      return campaignService.addTarget(parseInt(req.params.id), data);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/campaigns/targets/:id', { preHandler: [app.requireAuth], schema: { tags: ['Campaigns'], summary: 'Remover alvo', description: 'Remove um alvo de uma campanha' } }, async (req, reply) => {
    const deleted = await campaignService.removeTarget(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Alvo não encontrado' });
    return { success: true };
  });
}
