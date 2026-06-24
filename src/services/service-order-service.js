import db from '../db/adapter.js';

export async function listServiceOrders({ status, priority, equipment_id, client_id, search, page = 1, limit = 50 } = {}) {
  const conditions = [];
  if (status) conditions.push({ field: 'so.status', op: 'eq', value: status });
  if (priority) conditions.push({ field: 'so.priority', op: 'eq', value: priority });
  if (equipment_id) conditions.push({ field: 'so.equipment_id', op: 'eq', value: equipment_id });
  if (client_id) conditions.push({ field: 'so.client_id', op: 'eq', value: client_id });

  // Multi-field search via raw SQL OR
  if (search) {
    const where = [];
    const params = [];
    const q = `%${search}%`;
    where.push('(so.title LIKE ? OR so.description LIKE ?)');
    params.push(q, q);
    if (status) { where.push('so.status = ?'); params.push(status); }
    if (priority) { where.push('so.priority = ?'); params.push(priority); }
    if (equipment_id) { where.push('so.equipment_id = ?'); params.push(equipment_id); }
    if (client_id) { where.push('so.client_id = ?'); params.push(client_id); }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const countRow = await db.row(
      `SELECT COUNT(*) as total FROM service_orders so LEFT JOIN equipment e ON so.equipment_id = e.id LEFT JOIN companies c ON so.client_id = c.id ${whereClause}`,
      params
    );
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT so.*, e.name as equipment_name, c.name as client_name FROM service_orders so LEFT JOIN equipment e ON so.equipment_id = e.id LEFT JOIN companies c ON so.client_id = c.id ${whereClause} ORDER BY so.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { orders: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const result = await db.paginate('service_orders so', {
    columns: 'so.*, e.name as equipment_name, c.name as client_name',
    conditions: conditions.length > 0 ? conditions : null,
    joins: [
      { table: 'equipment e', foreignKey: 'so.equipment_id', columns: 'name as equipment_name' },
      { table: 'companies c', foreignKey: 'so.client_id', columns: 'name as client_name' },
    ],
    page, limit,
    orderBy: ['so.created_at', 'desc'],
  });

  return { orders: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages };
}

export async function getServiceOrder(id) {
  return db.get('service_orders', id);
}

export async function createServiceOrder(data) {
  return db.create('service_orders', {
    title: data.title, description: data.description || null,
    equipment_id: data.equipment_id || null, client_id: data.client_id || null,
    status: data.status || 'open', priority: data.priority || 'medium',
    assigned_to: data.assigned_to || null,
    value: data.value || 0, notes: data.notes || null,
  });
}

export async function updateServiceOrder(id, data) {
  const existing = await db.get('service_orders', id);
  if (!existing) return null;

  // Auto-set closed_at when status changes to closed
  if (data.status === 'closed' && existing.status !== 'closed') {
    const now = new Date();
    data.closed_at = now.toISOString();
  }

  return db.update('service_orders', id, data);
}

export async function deleteServiceOrder(id) {
  const existing = await db.get('service_orders', id);
  if (!existing) return false;
  return db.delete('service_orders', id);
}