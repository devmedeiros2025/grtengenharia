import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as userService from './user-service.js';

describe('User Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create user with valid data', async () => {
    const user = await userService.createUser({
      name: 'João Teste',
      email: 'joao@teste.com',
      password_hash: 'hash123',
      role: 'comercial',
    });
    assert.ok(user, 'Should be created');
    assert.ok(user.id > 0);
    assert.equal(user.name, 'João Teste');
    assert.equal(user.email, 'joao@teste.com');
    assert.equal(user.role, 'comercial');
    assert.equal(user.active, 1);
  });

  it('should list users with pagination', async () => {
    const result = await userService.listUsers({ page: 1, limit: 10 });
    assert.ok(result.users, 'Should have users array');
    assert.ok(Array.isArray(result.users));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
    assert.ok(result.totalPages >= 0);
  });

  it('should filter users by role', async () => {
    await userService.createUser({ name: 'Admin Teste', email: 'admin@teste.com', password_hash: 'hash', role: 'admin' });
    await userService.createUser({ name: 'Vendedor Teste', email: 'vendedor@teste.com', password_hash: 'hash', role: 'comercial' });
    const result = await userService.listUsers({ role: 'admin' });
    assert.ok(result.users.length > 0);
    assert.ok(result.users.every(u => u.role === 'admin'));
  });

  it('should search users by name', async () => {
    await userService.createUser({ name: 'NomeUnicoBusca', email: 'unico@teste.com', password_hash: 'hash' });
    const result = await userService.listUsers({ search: 'NomeUnicoBusca' });
    assert.ok(result.users.length > 0);
    assert.ok(result.users.some(u => u.name.includes('NomeUnicoBusca')));
  });

  it('should search users by email', async () => {
    const result = await userService.listUsers({ search: 'unico@teste.com' });
    assert.ok(result.users.length > 0);
    assert.ok(result.users.some(u => u.email.includes('unico@teste.com')));
  });

  it('should get user by id', async () => {
    const created = await userService.createUser({ name: 'Busca Teste', email: 'busca@teste.com', password_hash: 'hash' });
    const found = await userService.getUserById(created.id);
    assert.ok(found);
    assert.equal(found.name, 'Busca Teste');
    assert.equal(found.email, 'busca@teste.com');
  });

  it('should return null for non-existent user', async () => {
    const found = await userService.getUserById(99999);
    assert.equal(found, null);
  });

  it('should update user fields', async () => {
    const created = await userService.createUser({ name: 'Update Teste', email: 'update@teste.com', password_hash: 'hash' });
    const updated = await userService.updateUser(created.id, { name: 'Update Teste 2', role: 'admin' });
    assert.ok(updated);
    assert.equal(updated.name, 'Update Teste 2');
    assert.equal(updated.role, 'admin');
  });

  it('should update user active status', async () => {
    const created = await userService.createUser({ name: 'Active Teste', email: 'active@teste.com', password_hash: 'hash' });
    const updated = await userService.updateUser(created.id, { active: 0 });
    assert.ok(updated);
    assert.equal(updated.active, 0);
  });

  it('should delete user', async () => {
    const created = await userService.createUser({ name: 'Delete Teste', email: 'delete@teste.com', password_hash: 'hash' });
    const deleted = await userService.deleteUser(created.id);
    assert.equal(deleted, true);
    const found = await userService.getUserById(created.id);
    assert.equal(found, null);
  });

  it('should return false when deleting non-existent user', async () => {
    const deleted = await userService.deleteUser(99999);
    assert.equal(deleted, false);
  });
});
