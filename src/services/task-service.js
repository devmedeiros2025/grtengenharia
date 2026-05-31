import db from '../db/adapter.js';

export async function listTasks(filters = {}) {
  // Use raw SQL to avoid Supabase table alias incompatibility
  const params = [];
  const where = [];
  if (filters.status) { where.push('status = ?'); params.push(filters.status); }
  if (filters.deal_id) { where.push('deal_id = ?'); params.push(filters.deal_id); }
  if (filters.company_id) { where.push('company_id = ?'); params.push(filters.company_id); }
  if (filters.priority) { where.push('priority = ?'); params.push(filters.priority); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  return db.raw(`SELECT * FROM tasks ${whereClause} ORDER BY due_date ASC`, params);
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
