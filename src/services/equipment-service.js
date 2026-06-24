import db from '../db/adapter.js';

export async function listEquipment({ status, type, search, page = 1, limit = 50 } = {}) {
  const conditions = [];

  // Multi-field search via raw SQL OR
  if (search) {
    const where = [];
    const params = [];
    const q = `%${search}%`;
    where.push('(name LIKE ? OR brand LIKE ? OR model LIKE ? OR plate LIKE ?)');
    params.push(q, q, q, q);
    if (status) { where.push('status = ?'); params.push(status); }
    if (type) { where.push('type = ?'); params.push(type); }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const countRow = await db.row(`SELECT COUNT(*) as total FROM equipment ${whereClause}`, params);
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT * FROM equipment ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { equipment: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (status) conditions.push({ field: 'status', op: 'eq', value: status });
  if (type) conditions.push({ field: 'type', op: 'eq', value: type });

  const result = await db.paginate('equipment', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  return { equipment: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages };
}

export async function getEquipment(id) {
  return db.get('equipment', id);
}

export async function createEquipment(data) {
  return db.create('equipment', {
    name: data.name, type: data.type || null, brand: data.brand || null,
    model: data.model || null, plate: data.plate || null, year: data.year || null,
    status: data.status || 'available', daily_rate: data.daily_rate || 0,
    monthly_rate: data.monthly_rate || 0,
    photo: data.photo || null, notes: data.notes || null,
  });
}

export async function updateEquipment(id, data) {
  const existing = await db.get('equipment', id);
  if (!existing) return null;
  return db.update('equipment', id, data);
}

export async function deleteEquipment(id) {
  const existing = await db.get('equipment', id);
  if (!existing) return false;
  return db.delete('equipment', id);
}
