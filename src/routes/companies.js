import * as svc from '../services/company-service.js';
import { createCompanySchema, updateCompanySchema } from '../validators/company-validator.js';
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

export async function companyRoutes(app) {
  // GET /api/companies
  app.get('/api/companies', {
    preHandler: [app.requireAuth],
  }, async (request) => {
    return svc.listCompanies(request.query);
  });

  // GET /api/companies/stats
  app.get('/api/companies/stats', {
    preHandler: [app.requireAuth],
  }, async () => {
    return svc.getCompanyStats();
  });

  // GET /api/companies/:id
  app.get('/api/companies/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const company = svc.getCompany(Number(request.params.id));
    if (!company) return reply.code(404).send({ error: 'Empresa não encontrada' });
    return company;
  });

  // POST /api/companies
  app.post('/api/companies', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = createCompanySchema.parse(request.body);
      const company = svc.createCompany(data);
      return reply.code(201).send(company);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // PATCH /api/companies/:id
  app.patch('/api/companies/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    try {
      const data = updateCompanySchema.parse(request.body);
      const company = svc.updateCompany(Number(request.params.id), data);
      if (!company) return reply.code(404).send({ error: 'Empresa não encontrada' });
      return company;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  // DELETE /api/companies/:id
  app.delete('/api/companies/:id', {
    preHandler: [app.requireAuth],
  }, async (request, reply) => {
    const ok = svc.deleteCompany(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Empresa não encontrada' });
    return { ok: true };
  });
}
