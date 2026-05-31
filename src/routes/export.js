import * as leadService from '../services/lead-service.js';
import * as companyService from '../services/company-service.js';
import * as dealService from '../services/deal-service.js';
import { stringify } from 'csv-stringify/sync';

export async function exportRoutes(app) {
  // Export leads as CSV
  app.get('/api/leads/export', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const { status, source, search } = request.query;
    const result = leadService.listLeads({ status, source, search, page: 1, limit: 10000 });
    const leads = result.leads || [];

    const csv = stringify(leads.map(l => ({
      id: l.id, nome: l.name, email: l.email, telefone: l.phone,
      empresa: l.company, origem: l.source, status: l.status,
      data: l.created_at,
    })), { header: true });

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="leads.csv"');
    return reply.send(csv);
  });

  // Export companies as CSV
  app.get('/api/companies/export', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const result = companyService.listCompanies({ page: 1, limit: 10000 });
    const companies = result.companies || [];

    const csv = stringify(companies.map(c => ({
      id: c.id, nome: c.name, email: c.email, telefone: c.phone,
      cnpj: c.cnpj, cidade: c.city, estado: c.state, segmento: c.segment,
      status: c.active !== false ? 'Ativa' : 'Inativa',
    })), { header: true });

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="empresas.csv"');
    return reply.send(csv);
  });

  // Export deals as CSV
  app.get('/api/deals/export', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const result = dealService.listDeals({ page: 1, limit: 10000 });
    const deals = result.deals || [];

    const csv = stringify(deals.map(d => ({
      id: d.id, titulo: d.title, valor: d.value, estagio: d.stage,
      contato: d.contact_name, empresa: d.company_name,
      origem: d.source, data: d.created_at,
    })), { header: true });

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="negocios.csv"');
    return reply.send(csv);
  });
}
