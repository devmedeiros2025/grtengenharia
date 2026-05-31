import * as wh from '../services/webhook-service.js';
import { createInboundSchema, createOutboundSchema, updateOutboundSchema } from '../validators/webhook-validator.js';
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

export async function webhookRoutes(app) {
  // ─── Inbound ────────────────────────────────────────────────────────────

  // Listar configurações de inbound webhooks
  app.get('/api/settings/webhooks/inbound', {
    preHandler: [app.requireAuth],
  }, async () => {
    return wh.listInboundWebhooks();
  });

  // Criar inbound webhook (gera token)
  app.post('/api/settings/webhooks/inbound', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const { name, source } = createInboundSchema.parse(request.body);
      const hook = await wh.createInboundWebhook({ name, source });
      return reply.code(201).send(hook);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Deletar inbound webhook
  app.delete('/api/settings/webhooks/inbound/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const ok = wh.deleteInboundWebhook(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Webhook não encontrado' });
    return { ok: true };
  });

  // ─── Combined listing ──────────────────────────────────────────────────

  app.get('/api/settings/webhooks', {
    preHandler: [app.requireAuth],
  }, async () => {
    const inbound = wh.listInboundWebhooks();
    const outbound = wh.listOutboundWebhooks().map(h => ({ ...h, events: (h.event || '').split(',').filter(Boolean) }));
    return { inbound, outbound };
  });

  // ─── Outbound ───────────────────────────────────────────────────────────

  // Listar outbound webhooks
  app.get('/api/settings/webhooks/outbound', {
    preHandler: [app.requireAuth],
  }, async () => {
    return wh.listOutboundWebhooks();
  });

  // Criar outbound webhook
  app.post('/api/settings/webhooks/outbound', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = createOutboundSchema.parse(request.body);
      const hook = wh.createOutboundWebhook({ name: data.name, url: data.url, token: data.token, events: data.events });
      return reply.code(201).send(hook);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Atualizar outbound webhook
  app.patch('/api/settings/webhooks/outbound/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = updateOutboundSchema.parse(request.body);
      const hook = wh.updateOutboundWebhook(Number(request.params.id), data);
      if (!hook) return reply.code(404).send({ error: 'Webhook não encontrado' });
      return hook;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // Deletar outbound webhook
  app.delete('/api/settings/webhooks/outbound/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const ok = wh.deleteOutboundWebhook(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Webhook não encontrado' });
    return { ok: true };
  });

  // ─── Logs ───────────────────────────────────────────────────────────────

  app.get('/api/settings/webhooks/logs', {
    preHandler: [app.requireAuth],
  }, async (request) => {
    const { direction, limit } = request.query;
    return wh.listWebhookLogs({ direction, limit: Number(limit) || 50 });
  });

  // ─── API Keys ───────────────────────────────────────────────────────────

  app.get('/api/settings/api-keys', {
    preHandler: [app.requireAuth],
  }, async () => {
    return wh.listApiKeys();
  });

  app.post('/api/settings/api-keys', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const { name } = request.body || {};
    if (!name) return reply.code(400).send({ error: 'Nome é obrigatório' });
    const key = await wh.createApiKey(name);
    return reply.code(201).send(key);
  });

  app.delete('/api/settings/api-keys/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const ok = wh.deleteApiKey(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'API Key não encontrada' });
    return { ok: true };
  });
}
