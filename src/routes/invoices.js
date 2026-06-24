import * as invoiceService from '../services/invoice-service.js';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export default async function (app) {
  app.get('/api/invoices', { preHandler: [app.requireAuth], schema: { tags: ['Invoices'], summary: 'Listar faturas', description: 'Retorna lista paginada de faturas' } }, async (req, reply) => {
    const { page = 1, limit = 10, status, company_id } = req.query;
    return invoiceService.getAll({ page: parseInt(page), limit: parseInt(limit), status, company_id: company_id ? parseInt(company_id) : undefined });
  });

  app.post('/api/invoices', { preHandler: [app.requireAuth], schema: { tags: ['Invoices'], summary: 'Criar fatura', description: 'Adiciona uma nova fatura' } }, async (req, reply) => {
    try {
      const data = createInvoiceSchema.parse(req.body);
      const invoice = await invoiceService.create(data);
      const u = req.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'invoice', invoice.id, `Fatura #${invoice.invoice_number}`, `Criou fatura #${invoice.invoice_number}`);
      return reply.code(201).send(invoice);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.get('/api/invoices/:id', { preHandler: [app.requireAuth], schema: { tags: ['Invoices'], summary: 'Obter fatura por ID', description: 'Retorna detalhes de uma fatura específica' } }, async (req, reply) => {
    const invoice = await invoiceService.getById(parseInt(req.params.id));
    if (!invoice) return reply.code(404).send({ error: 'Fatura não encontrada' });
    return invoice;
  });

  app.patch('/api/invoices/:id', { preHandler: [app.requireAuth], schema: { tags: ['Invoices'], summary: 'Atualizar fatura', description: 'Atualiza dados de uma fatura existente' } }, async (req, reply) => {
    try {
      const data = updateInvoiceSchema.parse(req.body);
      const invoice = await invoiceService.update(parseInt(req.params.id), data);
      if (!invoice) return reply.code(404).send({ error: 'Fatura não encontrada' });
      const u = req.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'invoice', invoice.id, `Fatura #${invoice.invoice_number}`, `Atualizou fatura #${invoice.invoice_number}`);
      return invoice;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/invoices/:id', { preHandler: [app.requireAuth], schema: { tags: ['Invoices'], summary: 'Excluir fatura', description: 'Remove uma fatura' } }, async (req, reply) => {
    const invoice = await invoiceService.getById(parseInt(req.params.id));
    const deleted = await invoiceService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Fatura não encontrada' });
    const u = req.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'invoice', req.params.id, invoice?.invoice_number ? `Fatura #${invoice.invoice_number}` : null, `Removeu fatura #${invoice?.invoice_number}`);
    return { success: true };
  });

  app.get('/api/invoices/summary', { preHandler: [app.requireAuth], schema: { tags: ['Invoices'], summary: 'Resumo de faturas', description: 'Retorna resumo financeiro das faturas' } }, async (req, reply) => {
    return invoiceService.getSummary();
  });

  app.get('/api/invoices/overdue', { preHandler: [app.requireAuth], schema: { tags: ['Invoices'], summary: 'Faturas vencidas', description: 'Retorna faturas em atraso' } }, async (req, reply) => {
    return invoiceService.getOverdue();
  });
}
