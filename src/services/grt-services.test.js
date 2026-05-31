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

import * as equipmentService from './equipment-service.js';
import * as serviceOrderService from './service-order-service.js';
import * as contractService from './contract-service.js';

describe('Equipment Service', () => {
  after(() => {
    try { unlinkSync(testDbPath); } catch {}
    try { unlinkSync(testDbPath + '-wal'); } catch {}
    try { unlinkSync(testDbPath + '-shm'); } catch {}
  });

  it('should create equipment with valid data', () => {
    const eq = equipmentService.createEquipment({
      name: 'Retroescavadeira X1',
      type: 'Retroescavadeira',
      brand: 'Caterpillar',
      daily_rate: 1500,
    });
    assert.ok(eq, 'Equipment should be created');
    assert.equal(eq.name, 'Retroescavadeira X1');
    assert.equal(eq.type, 'Retroescavadeira');
    assert.equal(eq.status, 'available');
    assert.ok(eq.id > 0);
  });

  it('should create equipment with empty name (no throw)', () => {
    // Service does not throw — it inserts with empty name
    const eq = equipmentService.createEquipment({ name: '' });
    assert.ok(eq);
    assert.equal(eq.name, '');
  });

  it('should list equipment with pagination', () => {
    const result = equipmentService.listEquipment({ page: 1, limit: 10 });
    assert.ok(result.equipment, 'Should have equipment array');
    assert.ok(Array.isArray(result.equipment));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
    assert.ok(result.totalPages >= 0);
  });

  it('should filter equipment by status', () => {
    equipmentService.createEquipment({ name: 'EmUso Teste', status: 'in_use' });
    const result = equipmentService.listEquipment({ status: 'in_use' });
    assert.ok(result.equipment.length > 0);
    assert.equal(result.equipment[0].status, 'in_use');
  });

  it('should search equipment by name', () => {
    const result = equipmentService.listEquipment({ search: 'Retro' });
    assert.ok(result.equipment.length > 0);
    assert.ok(result.equipment.some(e => e.name.includes('Retro')));
  });

  it('should get equipment by id', () => {
    const created = equipmentService.createEquipment({ name: 'GetTest' });
    const found = equipmentService.getEquipment(created.id);
    assert.ok(found);
    assert.equal(found.name, 'GetTest');
  });

  it('should return null for non-existent equipment', () => {
    const found = equipmentService.getEquipment(99999);
    assert.equal(found, null);
  });

  it('should update equipment fields', () => {
    const created = equipmentService.createEquipment({ name: 'UpdateTest' });
    const updated = equipmentService.updateEquipment(created.id, { daily_rate: 2000, plate: 'XYZ-9876' });
    assert.ok(updated);
    assert.equal(updated.daily_rate, 2000);
    assert.equal(updated.plate, 'XYZ-9876');
  });

  it('should delete equipment', () => {
    const created = equipmentService.createEquipment({ name: 'DeleteTest' });
    const deleted = equipmentService.deleteEquipment(created.id);
    assert.ok(deleted);
    const found = equipmentService.getEquipment(created.id);
    assert.equal(found, null);
  });

  it('should return false when deleting non-existent equipment', () => {
    const deleted = equipmentService.deleteEquipment(99999);
    assert.equal(deleted, false);
  });
});

describe('Service Order Service', () => {
  it('should create service order', () => {
    const so = serviceOrderService.createServiceOrder({
      title: 'Manutenção Preventiva',
      description: 'Troca de óleo',
      priority: 'high',
      value: 2500,
    });
    assert.ok(so);
    assert.equal(so.title, 'Manutenção Preventiva');
    assert.equal(so.status, 'open');
    assert.equal(so.priority, 'high');
    assert.ok(so.id > 0);
  });

  it('should create OS with empty title (no throw)', () => {
    const so = serviceOrderService.createServiceOrder({ title: '' });
    assert.ok(so);
    assert.equal(so.title, '');
  });

  it('should list service orders with pagination', () => {
    const result = serviceOrderService.listServiceOrders({ page: 1, limit: 10 });
    assert.ok(result.orders, 'Should have orders array');
    assert.ok(Array.isArray(result.orders));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
  });

  it('should filter service orders by status', () => {
    serviceOrderService.createServiceOrder({ title: 'OSStatusTest', status: 'closed' });
    const result = serviceOrderService.listServiceOrders({ status: 'closed' });
    assert.ok(result.orders.length > 0);
    assert.equal(result.orders[0].status, 'closed');
  });

  it('should filter service orders by priority', () => {
    const result = serviceOrderService.listServiceOrders({ priority: 'high' });
    assert.ok(result.orders.some(o => o.priority === 'high'));
  });

  it('should update service order', () => {
    const created = serviceOrderService.createServiceOrder({ title: 'OSUpdate' });
    const updated = serviceOrderService.updateServiceOrder(created.id, { status: 'in_progress', value: 5000 });
    assert.ok(updated);
    assert.equal(updated.status, 'in_progress');
    assert.equal(updated.value, 5000);
  });

  it('should delete service order', () => {
    const created = serviceOrderService.createServiceOrder({ title: 'OSDelete' });
    const deleted = serviceOrderService.deleteServiceOrder(created.id);
    assert.ok(deleted);
    const found = serviceOrderService.getServiceOrder(created.id);
    assert.equal(found, null);
  });

  it('should return null for non-existent service order', () => {
    const found = serviceOrderService.getServiceOrder(99999);
    assert.equal(found, null);
  });
});

describe('Contract Service', () => {
  it('should create contract', () => {
    const ct = contractService.createContract({
      title: 'Locação Paver',
      type: 'rental',
      value: 45000,
      start_date: '2026-06-01',
      end_date: '2026-12-31',
    });
    assert.ok(ct);
    assert.equal(ct.title, 'Locação Paver');
    assert.equal(ct.type, 'rental');
    assert.equal(ct.status, 'active');
    assert.ok(ct.id > 0);
  });

  it('should create contract with empty title (no throw)', () => {
    const ct = contractService.createContract({ title: '' });
    assert.ok(ct);
    assert.equal(ct.title, '');
  });

  it('should list contracts with pagination', () => {
    const result = contractService.listContracts({ page: 1, limit: 10 });
    assert.ok(result.contracts, 'Should have contracts array');
    assert.ok(Array.isArray(result.contracts));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
  });

  it('should filter contracts by status', () => {
    contractService.createContract({ title: 'ContractStatus', status: 'ended' });
    const result = contractService.listContracts({ status: 'ended' });
    assert.ok(result.contracts.length > 0);
    assert.equal(result.contracts[0].status, 'ended');
  });

  it('should filter contracts by type', () => {
    const result = contractService.listContracts({ type: 'rental' });
    assert.ok(result.contracts.some(c => c.type === 'rental'));
  });

  it('should update contract', () => {
    const created = contractService.createContract({ title: 'ContractUpdate' });
    const updated = contractService.updateContract(created.id, { value: 60000, notes: 'Updated notes' });
    assert.ok(updated);
    assert.equal(updated.value, 60000);
    assert.equal(updated.notes, 'Updated notes');
  });

  it('should delete contract', () => {
    const created = contractService.createContract({ title: 'ContractDelete' });
    const deleted = contractService.deleteContract(created.id);
    assert.ok(deleted);
    const found = contractService.getContract(created.id);
    assert.equal(found, null);
  });

  it('should return null for non-existent contract', () => {
    const found = contractService.getContract(99999);
    assert.equal(found, null);
  });
});
