import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { setupTestDb, teardownTestDb } from './test-helper.js';

const testDbPath = setupTestDb(import.meta.url);

import * as taskService from './task-service.js';

describe('Task Service', () => {
  after(() => { teardownTestDb(testDbPath); });

  it('should create a task with valid data', async () => {
    const task = await taskService.createTask({
      title: 'Vistoria Técnica',
      description: 'Realizar vistoria no local da obra',
      priority: 'high',
      due_date: '2026-07-01',
      assigned_to: 'Ana Souza',
    });

    assert.ok(task, 'Task should be created');
    assert.ok(task.id > 0);
    assert.equal(task.title, 'Vistoria Técnica');
    assert.equal(task.description, 'Realizar vistoria no local da obra');
    assert.equal(task.priority, 'high');
    assert.equal(task.due_date, '2026-07-01');
    assert.equal(task.assigned_to, 'Ana Souza');
  });

  it('should create task with default values', async () => {
    const task = await taskService.createTask({ title: 'Task Minima' });
    assert.ok(task);
    assert.ok(task.id > 0);
    assert.equal(task.status, 'pending');
    assert.equal(task.priority, 'medium');
  });

  it('should get task by id', async () => {
    const created = await taskService.createTask({ title: 'Busca Task' });
    const found = await taskService.getTask(created.id);
    assert.ok(found);
    assert.equal(found.title, 'Busca Task');
    assert.equal(found.id, created.id);
  });

  it('should return null for non-existent task', async () => {
    const found = await taskService.getTask(99999);
    assert.equal(found, null);
  });

  it('should list tasks', async () => {
    await taskService.createTask({ title: 'List Task A' });
    await taskService.createTask({ title: 'List Task B' });

    const tasks = await taskService.listTasks();
    assert.ok(Array.isArray(tasks));
    assert.ok(tasks.length >= 2);
  });

  it('should filter tasks by status', async () => {
    await taskService.createTask({ title: 'Done Task', status: 'done' });
    await taskService.createTask({ title: 'Pending Task', status: 'pending' });

    const tasks = await taskService.listTasks({ status: 'done' });
    assert.ok(tasks.every(t => t.status === 'done'));
  });

  it('should filter tasks by priority', async () => {
    await taskService.createTask({ title: 'High Priority', priority: 'high' });

    const tasks = await taskService.listTasks({ priority: 'high' });
    assert.ok(tasks.some(t => t.title === 'High Priority'));
  });

  it('should filter tasks by assigned_to', async () => {
    await taskService.createTask({ title: 'Minha Task', assigned_to: 'Carlos' });

    const tasks = await taskService.listTasks({ assigned_to: 'Carlos' });
    assert.ok(Array.isArray(tasks));
  });

  it('should update task fields', async () => {
    const created = await taskService.createTask({ title: 'Task Original', priority: 'low' });
    const updated = await taskService.updateTask(created.id, {
      title: 'Task Atualizada',
      priority: 'high',
    });
    assert.ok(updated);
    assert.equal(updated.title, 'Task Atualizada');
    assert.equal(updated.priority, 'high');
  });

  it('should return null when updating non-existent task', async () => {
    const result = await taskService.updateTask(99999, { title: 'Ghost' });
    assert.equal(result, null);
  });

  it('should delete a task', async () => {
    const created = await taskService.createTask({ title: 'Delete Task' });
    const deleted = await taskService.deleteTask(created.id);
    assert.equal(deleted, true);
    const found = await taskService.getTask(created.id);
    assert.equal(found, null);
  });

  it('should return false when deleting non-existent task', async () => {
    const result = await taskService.deleteTask(99999);
    assert.equal(result, false);
  });
});
