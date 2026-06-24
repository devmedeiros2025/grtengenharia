import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as invoiceService from './invoice-service.js';

describe('Invoice Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create an invoice with valid data', async () => {
    const invoice = await invoiceService.create({
      company_id: 1,
      value: 15000,
      issue_date: '2026-06-01',
      due_date: '2026-07-01',
    });
    assert.ok(invoice, 'Invoice should be created');
    assert.ok(invoice.id > 0, 'Should have an id');
    assert.ok(invoice.invoice_number, 'Should have invoice number');
    assert.equal(invoice.value, 15000);
  });

  it('should list invoices with pagination', async () => {
    const result = await invoiceService.getAll({ page: 1, limit: 10 });
    assert.ok(result.invoices, 'Should have invoices array');
    assert.ok(Array.isArray(result.invoices));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.ok(result.totalPages >= 0);
  });

  it('should filter invoices by status', async () => {
    await invoiceService.create({ company_id: 1, value: 5000 });
    const result = await invoiceService.getAll({ status: 'pending' });
    assert.ok(result.invoices.length > 0);
    assert.ok(result.invoices.every(i => i.status === 'pending'));
  });

  it('should get invoice by id', async () => {
    const created = await invoiceService.create({ company_id: 1, value: 10000 });
    const found = await invoiceService.getById(created.id);
    assert.ok(found);
    assert.equal(found.value, 10000);
  });

  it('should return null for non-existent invoice', async () => {
    const found = await invoiceService.getById(99999);
    assert.equal(found, null);
  });

  it('should update invoice fields (status, payment_date)', async () => {
    const created = await invoiceService.create({ company_id: 1, value: 8000 });
    const updated = await invoiceService.update(created.id, {
      status: 'paid',
      payment_date: '2026-06-15',
    });
    assert.ok(updated, 'Should be updated');
    assert.equal(updated.status, 'paid');
    assert.equal(updated.payment_date, '2026-06-15');
  });

  it('should delete invoice', async () => {
    const created = await invoiceService.create({ company_id: 1, value: 3000 });
    const deleted = await invoiceService.delete_(created.id);
    assert.ok(deleted);
    const found = await invoiceService.getById(created.id);
    assert.equal(found, null);
  });
});
