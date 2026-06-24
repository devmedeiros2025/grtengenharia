import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as proposalService from './proposal-service.js';

describe('Proposal Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create a proposal with valid data', async () => {
    const proposal = await proposalService.create({
      title: 'Proposta Teste',
      company_id: 1,
      contact_name: 'João Teste',
      valid_until: '2026-12-31',
    });
    assert.ok(proposal, 'Proposal should be created');
    assert.ok(proposal.id > 0, 'Should have an id');
    assert.equal(proposal.title, 'Proposta Teste');
  });

  it('should list proposals with pagination', async () => {
    const result = await proposalService.getAll({ page: 1, limit: 10 });
    assert.ok(result.proposals, 'Should have proposals array');
    assert.ok(Array.isArray(result.proposals));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.ok(result.totalPages >= 0);
  });

  it('should filter proposals by status', async () => {
    await proposalService.create({ title: 'Draft Proposal', status: 'draft' });
    const result = await proposalService.getAll({ status: 'draft' });
    assert.ok(result.proposals.length > 0);
    assert.ok(result.proposals.every(p => p.status === 'draft'));
  });

  it('should get proposal by id', async () => {
    const created = await proposalService.create({ title: 'Busca Proposta' });
    const found = await proposalService.getById(created.id);
    assert.ok(found);
    assert.equal(found.title, 'Busca Proposta');
  });

  it('should return null for non-existent proposal', async () => {
    const found = await proposalService.getById(99999);
    assert.equal(found, null);
  });

  it('should update proposal fields', async () => {
    const created = await proposalService.create({ title: 'Update Proposta' });
    const updated = await proposalService.update(created.id, { title: 'Update Proposta 2', status: 'sent' });
    assert.ok(updated, 'Should be updated');
    assert.equal(updated.title, 'Update Proposta 2');
    assert.equal(updated.status, 'sent');
  });

  it('should delete proposal', async () => {
    const created = await proposalService.create({ title: 'Delete Proposta' });
    const deleted = await proposalService.delete_(created.id);
    assert.equal(deleted, true);
    const found = await proposalService.getById(created.id);
    assert.equal(found, null);
  });
});
