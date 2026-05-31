import * as leadService from '../services/lead-service.js';
import * as wh from '../services/webhook-service.js';

/**
 * Rota pública para n8n, formulários e site enviarem leads.
 *
 * POST /api/webhooks/inbound/:token
 *
 * O token identifica qual webhook configurado está sendo chamado.
 * O body pode ser:
 *   JSON: { name, email, phone, company, message, campaign, source, metadata }
 *   URL-encoded: name=...&email=...&phone=...
 *   Ou formato n8n padrão
 */
export async function inboundRoutes(app) {
  app.post('/api/webhooks/inbound/:token', async (request, reply) => {
    const { token } = request.params;

    // Valida token
    const hook = wh.getInboundWebhookByToken(token);
    if (!hook) {
      wh.logInboundWebhook(null, 'unknown', JSON.stringify(request.body), 401, 'Token inválido');
      return reply.code(401).send({ error: 'Token inválido ou webhook inativo' });
    }

    const payload = request.body || {};

    // Mapeia campos — aceita tanto formato CRM quanto formato n8n
    const lead = {
      name: payload.name || payload.nome || payload.Nome || payload.lead_name || payload.name_,
      email: payload.email || payload.Email || payload.email_address || '',
      phone: payload.phone || payload.telefone || payload.Telefone || payload.phone_number || payload.whatsapp || '',
      company: payload.company || payload.empresa || payload.Empresa || payload.company_name || payload.organization || '',
      message: payload.message || payload.mensagem || payload.Mensagem || payload.msg || payload.comment || payload.description || '',
      campaign: payload.campaign || payload.campanha || payload.Campanha || payload.utm_campaign || payload.utm_source || payload.source || payload.source_url || hook.source,
      source: hook.source || 'webhook',
      metadata: payload.metadata || payload,
    };

    if (!lead.name || !lead.name.trim()) {
      wh.logInboundWebhook(hook.id, hook.source, JSON.stringify(payload), 400, 'Nome é obrigatório');
      return reply.code(400).send({ error: 'Nome é obrigatório. Envie ao menos o campo "name".' });
    }

    try {
      const created = leadService.createLead(lead);

      wh.logInboundWebhook(hook.id, hook.name || hook.source, JSON.stringify(payload), 201, 'OK');

      return reply.code(201).send({
        ok: true,
        lead_id: created.id,
        message: 'Lead recebido com sucesso',
      });
    } catch (err) {
      wh.logInboundWebhook(hook.id, hook.source, JSON.stringify(payload), 400, err.message);
      return reply.code(400).send({ error: err.message });
    }
  });
}
