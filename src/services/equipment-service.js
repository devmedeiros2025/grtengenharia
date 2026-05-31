import db from '../db/adapter.js';

export async function listEquipment({ status, type, search, page = 1, limit = 50 } = {}) {
  const conditions = [];
  if (status) conditions.push({ field: 'status', op: 'eq', value: status });
  if (type) conditions.push({ field: 'type', op: 'eq', value: type });

  const result = await db.paginate('equipment', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  // Apply OR search in-memory (multi-field LIKE not supported by simple adapter)
  if (search) {
    const q = search.toLowerCase();
    result.data = result.data.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.brand || '').toLowerCase().includes(q) ||
      (e.model || '').toLowerCase().includes(q) ||
      (e.plate || '').toLowerCase().includes(q)
    );
    result.total = result.data.length;
    result.totalPages = Math.ceil(result.total / limit);
  }

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
