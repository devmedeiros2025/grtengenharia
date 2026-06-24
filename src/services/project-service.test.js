import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as projectService from './project-service.js';

describe('Project Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create a project with valid data', async () => {
    const project = await projectService.create({
      name: 'Projeto Teste',
      company_id: 1,
      description: 'Descrição do projeto',
      value: 50000,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });
    assert.ok(project, 'Project should be created');
    assert.ok(project.id > 0, 'Should have an id');
    assert.equal(project.name, 'Projeto Teste');
    assert.equal(project.value, 50000);
  });

  it('should list projects with pagination', async () => {
    const result = await projectService.getAll({ page: 1, limit: 10 });
    assert.ok(result.projects, 'Should have projects array');
    assert.ok(Array.isArray(result.projects));
    assert.ok(result.total >= 0);
    assert.equal(result.page, 1);
    assert.ok(result.totalPages >= 0);
  });

  it('should filter projects by status', async () => {
    const created = await projectService.create({ name: 'Projeto Parado' });
    await projectService.update(created.id, { status: 'paused' });
    const result = await projectService.getAll({ status: 'paused' });
    assert.ok(result.projects.length > 0);
    assert.ok(result.projects.every(p => p.status === 'paused'));
  });

  it('should get project by id', async () => {
    const created = await projectService.create({ name: 'Busca Projeto' });
    const found = await projectService.getById(created.id);
    assert.ok(found);
    assert.equal(found.name, 'Busca Projeto');
  });

  it('should return null for non-existent project', async () => {
    const found = await projectService.getById(99999);
    assert.equal(found, null);
  });

  it('should update project fields', async () => {
    const created = await projectService.create({ name: 'Update Projeto' });
    const updated = await projectService.update(created.id, { name: 'Update Projeto 2', value: 75000 });
    assert.ok(updated, 'Should be updated');
    assert.equal(updated.name, 'Update Projeto 2');
    assert.equal(updated.value, 75000);
  });

  it('should delete project', async () => {
    const created = await projectService.create({ name: 'Delete Projeto' });
    const deleted = await projectService.delete_(created.id);
    assert.equal(deleted, true);
    const found = await projectService.getById(created.id);
    assert.equal(found, null);
  });
});
