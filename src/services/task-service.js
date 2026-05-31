import { getDb } from '../db/schema.js';

export function listTasks(filters = {}) {
  const db = getDb();
  let sql = 'SELECT t.* FROM tasks t';
  const params = [];
  const where = [];

  if (filters.status) {
    where.push('t.status = ?');
    params.push(filters.status);
  }
  if (filters.deal_id) {
    where.push('t.deal_id = ?');
    params.push(filters.deal_id);
  }
  if (filters.company_id) {
    where.push('t.company_id = ?');
    params.push(filters.company_id);
  }
  if (filters.priority) {
    where.push('t.priority = ?');
    params.push(filters.priority);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY t.due_date ASC, t.created_at DESC';
  return db.prepare(sql).all(...params);
}

export function getTask(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) || null;
}

export function createTask(data) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date, deal_id, company_id, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.title, data.description || null,
    data.status || 'pending', data.priority || 'medium',
    data.due_date || null, data.deal_id || null,
    data.company_id || null, data.assigned_to || null
  );
  return getTask(Number(result.lastInsertRowid));
}

export function updateTask(id, data) {
  const db = getDb();
  const fields = ['title', 'description', 'status', 'priority', 'due_date', 'deal_id', 'company_id', 'assigned_to'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(data[f]);
    }
  }
  if (sets.length === 0) return null;
  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return getTask(id);
}

export function deleteTask(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getTaskStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM tasks').get();
  const pending = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'pending'").get();
  const done = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'done'").get();
  return { total: total.c, pending: pending.c, done: done.c };
}
