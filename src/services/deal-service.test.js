import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as dealService from './deal-service.js';

describe('Deal Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create a deal with valid data', async () => {
    const deal = await dealService.createDeal({
      title: 'Projeto Estrutural',
      value: 50000,
      stage: 'prospecting',
      contact_name: 'Carlos Silva',
    });

    assert.ok(deal, 'Deal should be created');
    assert.ok(deal.id > 0);
    assert.equal(deal.title, 'Projeto Estrutural');
    assert.equal(deal.value, 50000);
    assert.equal(deal.stage, 'prospecting');
    assert.equal(deal.contact_name, 'Carlos Silva');
  });

  it('should create deal with default values', async () => {
    const deal = await dealService.createDeal({ title: 'Deal Minimo' });
    assert.ok(deal);
    assert.ok(deal.id > 0);
    assert.equal(deal.stage, 'prospecting');
    assert.equal(deal.probability, 10);
    assert.equal(deal.value, 0);
    assert.equal(deal.currency, 'BRL');
  });

  it('should get deal by id', async () => {
    const created = await dealService.createDeal({ title: 'Busca Deal' });
    const found = await dealService.getDeal(created.id);
    assert.ok(found);
    assert.equal(found.title, 'Busca Deal');
  });

  it('should return null for non-existent deal', async () => {
    const found = await dealService.getDeal(99999);
    assert.equal(found, null);
  });

  it('should list deals with pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await dealService.createDeal({ title: `Deal Pagina ${i}` });
    }

    const result = await dealService.listDeals({ page: 1, limit: 3 });
    assert.ok(result.deals);
    assert.ok(Array.isArray(result.deals));
    assert.equal(result.page, 1);
    assert.equal(result.limit, 3);
    assert.ok(result.total >= 5);
    assert.ok(result.totalPages >= 2);
  });

  it('should filter deals by stage', async () => {
    await dealService.createDeal({ title: 'Prospecting Deal', stage: 'prospecting' });
    await dealService.createDeal({ title: 'Negotiation Deal', stage: 'negotiation' });

    const result = await dealService.listDeals({ stage: 'negotiation' });
    assert.ok(result.deals.every(d => d.stage === 'negotiation'));
  });

  it('should search deals by title', async () => {
    await dealService.createDeal({ title: 'TermoEspecificoDeal' });
    const result = await dealService.listDeals({ search: 'TermoEspecificoDeal' });
    assert.ok(result.deals.length > 0);
    assert.ok(result.deals.some(d => d.title.includes('TermoEspecificoDeal')));
  });

  it('should update deal fields', async () => {
    const created = await dealService.createDeal({ title: 'Deal Original', value: 1000 });
    const updated = await dealService.updateDeal(created.id, { title: 'Deal Atualizado', value: 9999 });
    assert.ok(updated);
    assert.equal(updated.title, 'Deal Atualizado');
    assert.equal(updated.value, 9999);
  });

  it('should update probability when stage changes', async () => {
    const created = await dealService.createDeal({ title: 'Stage Change' });
    const updated = await dealService.updateDeal(created.id, { stage: 'negotiation' });
    assert.ok(updated);
    assert.equal(updated.stage, 'negotiation');
    assert.ok(updated.probability != null);
  });

  it('should set closed_at when deal is won', async () => {
    const created = await dealService.createDeal({ title: 'Won Deal' });
    const updated = await dealService.updateDeal(created.id, { stage: 'won' });
    assert.ok(updated);
    assert.equal(updated.stage, 'won');
    assert.ok(updated.closed_at, 'closed_at should be set');
  });

  it('should set closed_at when deal is lost', async () => {
    const created = await dealService.createDeal({ title: 'Lost Deal' });
    const updated = await dealService.updateDeal(created.id, { stage: 'lost' });
    assert.ok(updated);
    assert.equal(updated.stage, 'lost');
    assert.ok(updated.closed_at, 'closed_at should be set');
  });

  it('should return null when updating non-existent deal', async () => {
    const result = await dealService.updateDeal(99999, { title: 'Ghost' });
    assert.equal(result, null);
  });

  it('should delete a deal', async () => {
    const created = await dealService.createDeal({ title: 'Delete Deal' });
    const deleted = await dealService.deleteDeal(created.id);
    assert.equal(deleted, true);
    const found = await dealService.getDeal(created.id);
    assert.equal(found, null);
  });

  it('should return false when deleting non-existent deal', async () => {
    const result = await dealService.deleteDeal(99999);
    assert.equal(result, false);
  });

  it('should list pipeline stages', async () => {
    const stages = await dealService.listPipelineStages();
    assert.ok(Array.isArray(stages));
    assert.ok(stages.length > 0);
  });
});
