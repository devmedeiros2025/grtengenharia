import db from '../db/adapter.js';

export async function getAll({ page = 1, limit = 10, status, company_id } = {}) {
  let sql = 'SELECT p.*, c.name as company_name FROM projects p LEFT JOIN companies c ON c.id = p.company_id WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (company_id) { sql += ' AND p.company_id = ?'; params.push(Number(company_id)); }

  const totalRow = await db.row(sql.replace('SELECT p.*, c.name as company_name', 'SELECT COUNT(*) as total'), params);
  const total = totalRow?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const projects = await db.raw(sql, params);
  return { projects, total, page, totalPages };
}

export async function getById(id) {
  const project = await db.row(
    'SELECT p.*, c.name as company_name FROM projects p LEFT JOIN companies c ON c.id = p.company_id WHERE p.id = ?',
    [id]
  );
  if (!project) return null;
  const phases = await db.raw('SELECT * FROM project_phases WHERE project_id = ? ORDER BY start_date ASC', [id]);
  project.phases = phases || [];
  return project;
}

export async function create({ name, company_id, description, start_date, end_date, value, notes }) {
  const result = await db.create('projects', {
    name, company_id: company_id || null, description: description || null,
    start_date: start_date || null, end_date: end_date || null,
    value: value || 0, notes: notes || null,
  });
  return getById(result.id);
}

export async function update(id, data) {
  const existing = await db.get('projects', id);
  if (!existing) return null;
  await db.update('projects', id, data);
  return getById(id);
}

export async function delete_(id) {
  return db.transaction(async (supabase) => {
    await supabase.from('project_phases').delete().eq('project_id', id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  });
}

// ── Phases ────────────────────────────────────────────────────────────

export async function addPhase(project_id, { name, description, start_date, end_date, progress }) {
  return db.create('project_phases', {
    project_id, name, description: description || null,
    start_date: start_date || null, end_date: end_date || null,
    progress: progress || 0,
  });
}

export async function updatePhase(id, data) {
  return db.update('project_phases', id, data);
}

export async function deletePhase(id) {
  return db.delete('project_phases', id);
}
