import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as campaignService from './campaign-service.js';

describe('Campaign Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create campaign with valid data', async () => {
    const campaign = await campaignService.create({
      name: 'Campanha Teste',
      type: 'email',
      status: 'draft',
    });
    assert.ok(campaign, 'Should be created');
    assert.ok(campaign.id > 0);
    assert.equal(campaign.name, 'Campanha Teste');
    assert.equal(campaign.type, 'email');
    assert.equal(campaign.status, 'draft');
  });

  it('should create campaign with default values', async () => {
    const campaign = await campaignService.create({ name: 'Defaults' });
    assert.ok(campaign);
    assert.equal(campaign.type, 'email');
    assert.equal(campaign.status, 'draft');
    assert.equal(campaign.budget, 0);
  });

  it('should list campaigns with pagination', async () => {
    const result = await campaignService.getAll({ page: 1, limit: 10 });
    assert.ok(result.campaigns, 'Should have campaigns array');
    assert.ok(Array.isArray(result.campaigns));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.equal(result.totalPages >= 0, true);
  });

  it('should filter campaigns by status', async () => {
    await campaignService.create({ name: 'Status Test', status: 'sent' });
    const result = await campaignService.getAll({ status: 'sent' });
    assert.ok(result.campaigns.length > 0);
    assert.ok(result.campaigns.every(c => c.status === 'sent'));
  });

  it('should filter campaigns by type', async () => {
    await campaignService.create({ name: 'SMS Test', type: 'sms' });
    const result = await campaignService.getAll({ type: 'sms' });
    assert.ok(result.campaigns.length > 0);
    assert.ok(result.campaigns.every(c => c.type === 'sms'));
  });

  it('should get campaign by id', async () => {
    const created = await campaignService.create({ name: 'Get By Id' });
    const found = await campaignService.getById(created.id);
    assert.ok(found);
    assert.equal(found.name, 'Get By Id');
    assert.ok(Array.isArray(found.targets));
  });

  it('should return null for non-existent campaign', async () => {
    const found = await campaignService.getById(99999);
    assert.equal(found, null);
  });

  it('should update campaign fields', async () => {
    const created = await campaignService.create({ name: 'Update Campaign', status: 'draft' });
    const updated = await campaignService.update(created.id, { name: 'Updated Name', status: 'scheduled' });
    assert.ok(updated);
    assert.equal(updated.name, 'Updated Name');
    assert.equal(updated.status, 'scheduled');
  });

  it('should return null when updating non-existent campaign', async () => {
    const updated = await campaignService.update(99999, { name: 'Nope' });
    assert.equal(updated, null);
  });

  it('should delete campaign', async () => {
    const created = await campaignService.create({ name: 'Delete Campaign' });
    const deleted = await campaignService.delete_(created.id);
    assert.equal(deleted, true);
    const found = await campaignService.getById(created.id);
    assert.equal(found, null);
  });

  it('should add and remove target from campaign', async () => {
    const campaign = await campaignService.create({ name: 'Target Test' });
    const target = await campaignService.addTarget(campaign.id, { email: 'alvo@teste.com' });
    assert.ok(target);
    assert.ok(target.id > 0);
    assert.equal(target.email, 'alvo@teste.com');

    const removed = await campaignService.removeTarget(target.id);
    assert.ok(removed);
  });
});
