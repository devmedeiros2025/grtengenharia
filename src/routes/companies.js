import * as svc from '../services/company-service.js';
import { createCompanySchema, updateCompanySchema } from '../validators/company-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';
import { logActivity } from './users.js';

export async function companyRoutes(app) {
  // GET /api/companies
  app.get('/api/companies', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Companies'], summary: 'Listar empresas', description: 'Retorna lista paginada de empresas' },
  }, async (request) => {
    return svc.listCompanies(request.query);
  });

  // GET /api/companies/stats
  app.get('/api/companies/stats', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Companies'], summary: 'Estatísticas de empresas', description: 'Retorna resumo estatístico das empresas' },
  }, async () => {
    return svc.getCompanyStats();
  });

  // GET /api/companies/:id
  app.get('/api/companies/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Companies'], summary: 'Obter empresa por ID', description: 'Retorna detalhes de uma empresa específica' },
  }, async (request, reply) => {
    const company = await svc.getCompany(Number(request.params.id));
    if (!company) return reply.code(404).send({ error: 'Empresa não encontrada' });
    return company;
  });

  // Create company
  app.post('/api/companies', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Companies'], summary: 'Criar empresa', description: 'Adiciona uma nova empresa' },
  }, async (request, reply) => {
    try {
      const data = createCompanySchema.parse(request.body);
      const company = await svc.createCompany(data);
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'create', 'company', company.id, company.name, `Criou empresa ${company.name}`);
      return reply.code(201).send(company);
    } catch (err) { return handleValidationError(err, reply); }
  });

  // Update company
  app.patch('/api/companies/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Companies'], summary: 'Atualizar empresa', description: 'Atualiza dados de uma empresa existente' },
  }, async (request, reply) => {
    try {
      const data = updateCompanySchema.parse(request.body);
      const company = await svc.updateCompany(Number(request.params.id), data);
      if (!company) return reply.code(404).send({ error: 'Empresa não encontrada' });
      const u = request.user || {};
      await logActivity(u.sub || 'admin', u.name || 'admin', 'update', 'company', company.id, company.name, `Atualizou empresa ${company.name}`);
      return company;
    } catch (err) { return handleValidationError(err, reply); }
  });

  // Delete company
  app.delete('/api/companies/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Companies'], summary: 'Excluir empresa', description: 'Remove uma empresa do sistema' },
  }, async (request, reply) => {
    const company = await svc.getCompany(Number(request.params.id));
    const ok = await svc.deleteCompany(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Empresa não encontrada' });
    const u = request.user || {};
    await logActivity(u.sub || 'admin', u.name || 'admin', 'delete', 'company', request.params.id, company?.name, `Removeu empresa ${company?.name}`);
    return { ok: true };
  });
}
