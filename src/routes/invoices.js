import * as invoiceService from '../services/invoice-service.js';

export default async function (app) {
  app.get('/api/invoices', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { page = 1, limit = 10, status, company_id } = req.query;
    return invoiceService.getAll({ page: parseInt(page), limit: parseInt(limit), status, company_id: company_id ? parseInt(company_id) : undefined });
  });

  app.post('/api/invoices', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { company_id, contract_id, value, issue_date, due_date, payment_date, notes } = req.body;
    return invoiceService.create({ company_id, contract_id, value, issue_date, due_date, payment_date, notes });
  });

  app.get('/api/invoices/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const invoice = invoiceService.getById(parseInt(req.params.id));
    if (!invoice) return reply.code(404).send({ error: 'Fatura não encontrada' });
    return invoice;
  });

  app.patch('/api/invoices/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return invoiceService.update(parseInt(req.params.id), req.body);
  });

  app.delete('/api/invoices/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = invoiceService.delete_(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Fatura não encontrada' });
    return { success: true };
  });

  app.get('/api/invoices/summary', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return invoiceService.getSummary();
  });

  app.get('/api/invoices/overdue', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return invoiceService.getOverdue();
  });
}
