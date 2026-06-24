import db from '../db/adapter.js';

export async function createUser({ name, email, password_hash, role = 'comercial', cargo, funcao }) {
  return db.create('users', {
    name, email, password_hash, role, cargo: cargo || null, funcao: funcao || null, active: 1,
  });
}

export async function listUsers({ page = 1, limit = 50, role, search } = {}) {
  const conditions = [];
  const params = [];

  if (role) conditions.push({ field: 'role', op: 'eq', value: role });

  const offset = (page - 1) * limit;

  if (search) {
    const where = [];
    if (role) { where.push('role = ?'); params.push(role); }
    const q = `%${search}%`;
    where.push('(name LIKE ? OR email LIKE ?)');
    params.push(q, q);
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.row(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { users: rows || [], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const result = await db.paginate('users', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  return {
    users: result.data,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}

export async function getUserById(id) {
  const row = await db.get('users', id);
  if (!row) return null;
  return row;
}

export async function updateUser(id, data) {
  const existing = await db.get('users', id);
  if (!existing) return null;

  const updateData = {};
  const allowed = ['name', 'email', 'role', 'cargo', 'funcao', 'active', 'password_hash'];
  for (const field of allowed) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }

  if (Object.keys(updateData).length === 0) return existing;

  await db.update('users', id, updateData);
  return db.get('users', id);
}

export async function deleteUser(id) {
  const existing = await db.get('users', id);
  if (!existing) return false;
  return db.delete('users', id);
}
