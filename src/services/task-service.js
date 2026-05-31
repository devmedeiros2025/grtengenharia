import db from '../db/adapter.js';

export async function listTasks(filters = {}) {
  let conditions = [];
  if (filters.status) conditions.push({ field: 't.status', op: 'eq', value: filters.status });
  if (filters.deal_id) conditions.push({ field: 't.deal_id', op: 'eq', value: filters.deal_id });
  if (filters.company_id) conditions.push({ field: 't.company_id', op: 'eq', value: filters.company_id });
  if (filters.priority) conditions.push({ field: 't.priority', op: 'eq', value: filters.priority });
  if (conditions.length === 0) conditions = null;

  return db.select('tasks t', {
    columns: 't.*',
    conditions,
    orderBy: ['t.due_date', 'asc'],
  });
}

export async function getTask(id) {
  return db.get('tasks', id);
}

export async function createTask(data) {
  return db.create('tasks', {
    title: data.title,
    description: data.description || null,
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    due_date: data.due_date || null,
    deal_id: data.deal_id || null,
    company_id: data.company_id || null,
    assigned_to: data.assigned_to || null,
  });
}

export async function updateTask(id, data) {
  const existing = await db.get('tasks', id);
  if (!existing) return null;
  return db.update('tasks', id, data);
}

export async function deleteTask(id) {
  return db.delete('tasks', id);
}

export async function getTaskStats() {
  const [total, pending, done] = await Promise.all([
    db.count('tasks'),
    db.count('tasks', [{ field: 'status', op: 'eq', value: 'pending' }]),
    db.count('tasks', [{ field: 'status', op: 'eq', value: 'done' }]),
  ]);
  return { total, pending, done };
}
