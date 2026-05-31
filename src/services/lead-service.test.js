import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDbPath = join(__dirname, '..', '..', 'data', 'crm-test.db');

// Override DB path BEFORE any imports that use it
process.env.DB_PATH = testDbPath;

// Clean up any existing test DB
try { unlinkSync(testDbPath); } catch {}
try { unlinkSync(testDbPath + '-wal'); } catch {}
try { unlinkSync(testDbPath + '-shm'); } catch {}

import * as leadService from './lead-service.js';

describe('Lead Service', () => {
  after(() => {
    // Cleanup test DB
    try { unlinkSync(testDbPath); } catch {}
    try { unlinkSync(testDbPath + '-wal'); } catch {}
    try { unlinkSync(testDbPath + '-shm'); } catch {}
  });

  it('should create a lead with valid data', () => {
    const lead = leadService.createLead({
      name: 'João Teste',
      email: 'joao@teste.com',
      phone: '11999999999',
      company: 'Empresa Teste',
      source: 'api',
    });

    assert.ok(lead, 'Lead should be created');
    assert.equal(lead.name, 'João Teste');
    assert.equal(lead.email, 'joao@teste.com');
    assert.ok(lead.id > 0, 'Lead should have an id');
    assert.equal(lead.status, 'new');
  });

  it('should throw when creating lead without name', () => {
    assert.throws(() => {
      leadService.createLead({ name: '' });
    }, /Nome é obrigatório/);
  });

  it('should list leads with pagination', () => {
    const result = leadService.listLeads({ page: 1, limit: 10 });
    assert.ok(result.leads, 'Should have leads array');
    assert.ok(Array.isArray(result.leads));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
    assert.ok(result.totalPages >= 0);
  });

  it('should get lead by id', () => {
    const created = leadService.createLead({ name: 'Busca Teste' });
    const found = leadService.getLeadById(created.id);
    assert.ok(found);
    assert.equal(found.name, 'Busca Teste');
  });

  it('should return null for non-existent lead', () => {
    const found = leadService.getLeadById(99999);
    assert.equal(found, null);
  });

  it('should update lead fields', () => {
    const created = leadService.createLead({ name: 'Update Teste' });
    const updated = leadService.updateLead(created.id, { name: 'Update Teste 2', score: 50 });
    assert.ok(updated);
    assert.equal(updated.name, 'Update Teste 2');
    assert.equal(updated.score, 50);
  });

  it('should delete lead', () => {
    const created = leadService.createLead({ name: 'Delete Teste' });
    const deleted = leadService.deleteLead(created.id);
    assert.equal(deleted, true);
    const found = leadService.getLeadById(created.id);
    assert.equal(found, null);
  });

  it('should return false when deleting non-existent lead', () => {
    const deleted = leadService.deleteLead(99999);
    assert.equal(deleted, false);
  });

  it('should get leads stats', () => {
    const stats = leadService.getLeadsStats();
    assert.ok(stats.total >= 0);
    assert.ok(stats.byStatus);
    assert.ok(typeof stats.byStatus === 'object');
  });

  it('should search leads by name', () => {
    leadService.createLead({ name: 'TermoEspecificoBusca' });
    const result = leadService.listLeads({ search: 'TermoEspecificoBusca' });
    assert.ok(result.leads.length > 0);
    assert.ok(result.leads.some(l => l.name.includes('TermoEspecificoBusca')));
  });
});
