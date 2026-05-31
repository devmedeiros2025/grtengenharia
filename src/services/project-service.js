import { getDb } from '../db/schema.js';

export function getAll({ page = 1, limit = 10, status, company_id } = {}) {
  const db = getDb();
  let sql = 'SELECT p.*, c.name as company_name FROM projects p LEFT JOIN companies c ON c.id = p.company_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (company_id) { sql += ' AND p.company_id = ?'; params.push(Number(company_id)); }
  const total = db.prepare(sql.replace('SELECT p.*, c.name as company_name', 'SELECT COUNT(*) as total')).get(...params).total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const projects = db.prepare(sql).all(...params).map(normalize);
  return { projects, total, page, totalPages };
}

export function getById(id) {
  const db = getDb();
  const project = normalize(db.prepare('SELECT p.*, c.name as company_name FROM projects p LEFT JOIN companies c ON c.id = p.company_id WHERE p.id = ?').get(id));
  if (!project) return null;
  project.phases = db.prepare('SELECT * FROM project_phases WHERE project_id = ? ORDER BY start_date ASC').all(id).map(normalizePhase);
  return project;
}

export function create({ name, company_id, description, start_date, end_date, value, notes }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO projects (name, company_id, description, start_date, end_date, value, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, company_id || null, description || null, start_date || null, end_date || null, value || 0, notes || null);
  return getById(Number(result.lastInsertRowid));
}

export function update(id, data) {
  const db = getDb();
  const fields = [];
  const params = [];
  for (const key of ['name', 'company_id', 'description', 'status', 'start_date', 'end_date', 'value', 'notes']) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
  }
  if (fields.length === 0) return getById(id);
  fields.push("updated_at = datetime('now')");
  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  return getById(id);
}

export function delete_(id) {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM project_phases WHERE project_id = ?').run(id);
    return db.prepare('DELETE FROM projects WHERE id = ?').run(id).changes > 0;
  });
  return transaction();
}

export function addPhase(project_id, { name, description, start_date, end_date, progress }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO project_phases (project_id, name, description, start_date, end_date, progress)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(project_id, name, description || null, start_date || null, end_date || null, progress || 0);
  return db.prepare('SELECT * FROM project_phases WHERE id = ?').get(Number(result.lastInsertRowid));
}

export function updatePhase(id, { name, description, status, start_date, end_date, progress }) {
  const db = getDb();
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (start_date !== undefined) { fields.push('start_date = ?'); params.push(start_date); }
  if (end_date !== undefined) { fields.push('end_date = ?'); params.push(end_date); }
  if (progress !== undefined) { fields.push('progress = ?'); params.push(progress); }
  if (fields.length === 0) return db.prepare('SELECT * FROM project_phases WHERE id = ?').get(id);
  db.prepare(`UPDATE project_phases SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  return db.prepare('SELECT * FROM project_phases WHERE id = ?').get(id);
}

export function deletePhase(id) {
  const db = getDb();
  return db.prepare('DELETE FROM project_phases WHERE id = ?').run(id).changes > 0;
}

function normalize(p) {
  if (!p) return null;
  return { ...p, value: parseFloat(p.value || 0) };
}

function normalizePhase(ph) {
  if (!ph) return null;
  return { ...ph, progress: ph.progress || 0 };
}
