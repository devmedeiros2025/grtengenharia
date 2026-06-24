import * as wh from '../services/webhook-service.js';
import { createInboundSchema, createOutboundSchema, updateInboundSchema, updateOutboundSchema, updateApiKeySchema } from '../validators/webhook-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';

export async function webhookRoutes(app) {
  // ─── Inbound ────────────────────────────────────────────────────────────

  // Listar configurações de inbound webhooks
  app.get('/api/settings/webhooks/inbound', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Listar inbound webhooks', description: 'Retorna lista de configurações de inbound webhooks' },
  }, async () => {
    return wh.listInboundWebhooks();
  });

  // Criar inbound webhook (gera token)
  app.post('/api/settings/webhooks/inbound', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Criar inbound webhook', description: 'Cria uma nova configuração de inbound webhook com token' },
  }, async (request, reply) => {
    try {
      const { name, source } = createInboundSchema.parse(request.body);
      const hook = await wh.createInboundWebhook({ name, source });
      return reply.code(201).send(hook);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Atualizar inbound webhook
  app.patch('/api/settings/webhooks/inbound/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Atualizar inbound webhook', description: 'Atualiza dados de um inbound webhook existente' },
  }, async (request, reply) => {
    try {
      const data = updateInboundSchema.parse(request.body);
      const hook = await wh.updateInboundWebhook(Number(request.params.id), data);
      if (!hook) return reply.code(404).send({ error: 'Webhook não encontrado' });
      return hook;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Deletar inbound webhook
  app.delete('/api/settings/webhooks/inbound/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Excluir inbound webhook', description: 'Remove uma configuração de inbound webhook' },
  }, async (request, reply) => {
    const ok = await wh.deleteInboundWebhook(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Webhook não encontrado' });
    return { ok: true };
  });

  // ─── Combined listing ──────────────────────────────────────────────────

  app.get('/api/settings/webhooks', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Listar webhooks', description: 'Retorna todos os webhooks inbound e outbound' },
  }, async () => {
    const inbound = await wh.listInboundWebhooks();
    const outbound = (await wh.listOutboundWebhooks()).map(h => ({ ...h, events: (h.event || '').split(',').filter(Boolean) }));
    return { inbound, outbound };
  });

  // ─── Outbound ───────────────────────────────────────────────────────────

  // Listar outbound webhooks
  app.get('/api/settings/webhooks/outbound', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Listar outbound webhooks', description: 'Retorna lista de configurações de outbound webhooks' },
  }, async () => {
    return wh.listOutboundWebhooks();
  });

  // Criar outbound webhook
  app.post('/api/settings/webhooks/outbound', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Criar outbound webhook', description: 'Cria uma nova configuração de outbound webhook' },
  }, async (request, reply) => {
    try {
      const data = createOutboundSchema.parse(request.body);
      const hook = await wh.createOutboundWebhook({ name: data.name, url: data.url, token: data.token, events: data.events });
      return reply.code(201).send(hook);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Atualizar outbound webhook
  app.patch('/api/settings/webhooks/outbound/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Atualizar outbound webhook', description: 'Atualiza dados de um outbound webhook existente' },
  }, async (request, reply) => {
    try {
      const data = updateOutboundSchema.parse(request.body);
      const hook = await wh.updateOutboundWebhook(Number(request.params.id), data);
      if (!hook) return reply.code(404).send({ error: 'Webhook não encontrado' });
      return hook;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Deletar outbound webhook
  app.delete('/api/settings/webhooks/outbound/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Excluir outbound webhook', description: 'Remove uma configuração de outbound webhook' },
  }, async (request, reply) => {
    const ok = await wh.deleteOutboundWebhook(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Webhook não encontrado' });
    return { ok: true };
  });

  // ─── Logs ───────────────────────────────────────────────────────────────

  app.get('/api/settings/webhooks/logs', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Webhooks'], summary: 'Logs de webhooks', description: 'Retorna logs de execução de webhooks' },
  }, async (request) => {
    const { direction, limit } = request.query;
    return wh.listWebhookLogs({ direction, limit: Number(limit) || 50 });
  });

  // ─── API Keys ───────────────────────────────────────────────────────────

  app.get('/api/settings/api-keys', {
    preHandler: [app.requireAuth],
    schema: { tags: ['API Keys'], summary: 'Listar API Keys', description: 'Retorna lista de chaves de API' },
  }, async () => {
    return wh.listApiKeys();
  });

  app.post('/api/settings/api-keys', {
    preHandler: [app.requireAuth],
    schema: { tags: ['API Keys'], summary: 'Criar API Key', description: 'Gera uma nova chave de API' },
  }, async (request, reply) => {
    const { name } = request.body || {};
    if (!name) return reply.code(400).send({ error: 'Nome é obrigatório' });
    const key = await wh.createApiKey(name);
    return reply.code(201).send(key);
  });

  app.patch('/api/settings/api-keys/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['API Keys'], summary: 'Atualizar API Key', description: 'Atualiza dados de uma chave de API' },
  }, async (request, reply) => {
    try {
      const data = updateApiKeySchema.parse(request.body);
      const key = await wh.updateApiKey(Number(request.params.id), data);
      if (!key) return reply.code(404).send({ error: 'API Key não encontrada' });
      return key;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/settings/api-keys/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['API Keys'], summary: 'Excluir API Key', description: 'Remove uma chave de API' },
  }, async (request, reply) => {
    const ok = await wh.deleteApiKey(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'API Key não encontrada' });
    return { ok: true };
  });
}
