import db from '../db/adapter.js';

export async function listDailyRoutines(filters = {}) {
  const conditions = [];
  if (filters.status) conditions.push({ field: 'status', op: 'eq', value: filters.status });
  if (filters.priority) conditions.push({ field: 'priority', op: 'eq', value: filters.priority });
  if (filters.assigned_to) conditions.push({ field: 'assigned_to', op: 'eq', value: filters.assigned_to });

  return db.select('daily_routines', {
    columns: '*',
    conditions: conditions.length > 0 ? conditions : null,
    orderBy: ['created_at', 'desc'],
  });
}

export async function getDailyRoutine(id) {
  return db.get('daily_routines', id);
}

export async function createDailyRoutine(data) {
  return db.create('daily_routines', {
    title: data.title,
    description: data.description || null,
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    assigned_to: data.assigned_to || null,
    due_date: data.due_date || null,
    column_name: data.column_name || 'todo',
    order_index: data.order_index || 0,
    assigned_by: data.assigned_by || null,
  });
}

export async function updateDailyRoutine(id, data) {
  const existing = await db.get('daily_routines', id);
  if (!existing) return null;
  return db.update('daily_routines', id, data);
}

export async function deleteDailyRoutine(id) {
  return db.delete('daily_routines', id);
}

export async function getDailyRoutineStats() {
  const [total, pending, inProgress, done] = await Promise.all([
    db.count('daily_routines'),
    db.count('daily_routines', [{ field: 'status', op: 'eq', value: 'pending' }]),
    db.count('daily_routines', [{ field: 'status', op: 'eq', value: 'in_progress' }]),
    db.count('daily_routines', [{ field: 'status', op: 'eq', value: 'done' }]),
  ]);
  return { total, pending, inProgress, done };
}
