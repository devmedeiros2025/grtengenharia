import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as companyService from './company-service.js';

describe('Company Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create a company with valid data', async () => {
    const company = await companyService.createCompany({
      name: 'GRT Engenharia',
      email: 'contato@grtengenharia.com.br',
      phone: '11988887777',
      cnpj: '11222333000181',
      segment: 'engenharia',
      address: 'Rua Exemplo, 123',
    });

    assert.ok(company, 'Company should be created');
    assert.ok(company.id > 0);
    assert.equal(company.name, 'GRT Engenharia');
    assert.equal(company.email, 'contato@grtengenharia.com.br');
    assert.equal(company.cnpj, '11222333000181');
    assert.equal(company.segment, 'engenharia');
  });

  it('should create company with only required fields', async () => {
    const company = await companyService.createCompany({ name: 'Minima Ltda' });
    assert.ok(company);
    assert.ok(company.id > 0);
    assert.equal(company.name, 'Minima Ltda');
    assert.equal(company.status, 'active');
  });

  it('should get company by id', async () => {
    const created = await companyService.createCompany({ name: 'Busca Ltda' });
    const found = await companyService.getCompany(created.id);
    assert.ok(found);
    assert.equal(found.name, 'Busca Ltda');
    assert.equal(found.id, created.id);
  });

  it('should return null for non-existent company', async () => {
    const found = await companyService.getCompany(99999);
    assert.equal(found, null);
  });

  it('should list companies with pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await companyService.createCompany({ name: `Pagina Empresa ${i}` });
    }

    const result = await companyService.listCompanies({ page: 1, limit: 3 });
    assert.ok(result.companies);
    assert.ok(Array.isArray(result.companies));
    assert.equal(result.page, 1);
    assert.equal(result.limit, 3);
    assert.ok(result.total >= 5);
    assert.ok(result.totalPages >= 2);
  });

  it('should filter companies by status', async () => {
    await companyService.createCompany({ name: 'Ativa Ltda', status: 'active' });
    await companyService.createCompany({ name: 'Inativa Ltda', status: 'inactive' });

    const result = await companyService.listCompanies({ status: 'inactive' });
    assert.ok(result.companies.every(c => c.status === 'inactive'));
  });

  it('should filter companies by segment', async () => {
    await companyService.createCompany({ name: 'Tech SA', segment: 'tecnologia' });

    const result = await companyService.listCompanies({ segment: 'tecnologia' });
    assert.ok(result.companies.some(c => c.name === 'Tech SA'));
  });

  it('should search companies by name', async () => {
    await companyService.createCompany({ name: 'AlvoDaBusca Ltda' });
    const result = await companyService.listCompanies({ search: 'AlvoDaBusca' });
    assert.ok(result.companies.length > 0);
    assert.ok(result.companies.some(c => c.name.includes('AlvoDaBusca')));
  });

  it('should search companies by email', async () => {
    await companyService.createCompany({ name: 'EmailTeste', email: 'busca@email.com' });
    const result = await companyService.listCompanies({ search: 'busca@email.com' });
    assert.ok(result.companies.length > 0);
  });

  it('should search companies by cnpj', async () => {
    await companyService.createCompany({ name: 'CnpjTeste', cnpj: '99888777000155' });
    const result = await companyService.listCompanies({ search: '99888777000155' });
    assert.ok(result.companies.length > 0);
  });

  it('should update company fields', async () => {
    const created = await companyService.createCompany({ name: 'Antiga Ltda' });
    const updated = await companyService.updateCompany(created.id, {
      name: 'Nova Ltda',
      segment: 'construcao',
    });
    assert.ok(updated);
    assert.equal(updated.name, 'Nova Ltda');
    assert.equal(updated.segment, 'construcao');
  });

  it('should return null when updating non-existent company', async () => {
    const result = await companyService.updateCompany(99999, { name: 'Ghost' });
    assert.equal(result, null);
  });

  it('should delete a company', async () => {
    const created = await companyService.createCompany({ name: 'Delete Ltda' });
    const deleted = await companyService.deleteCompany(created.id);
    assert.equal(deleted, true);
    const found = await companyService.getCompany(created.id);
    assert.equal(found, null);
  });

  it('should return false when deleting non-existent company', async () => {
    const result = await companyService.deleteCompany(99999);
    assert.equal(result, false);
  });
});
