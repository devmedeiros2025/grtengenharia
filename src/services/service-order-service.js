import db from '../db/adapter.js';

export async function listServiceOrders({ status, priority, equipment_id, client_id, page = 1, limit = 50 } = {}) {
  const conditions = [];
  if (status) conditions.push({ field: 'so.status', op: 'eq', value: status });
  if (priority) conditions.push({ field: 'so.priority', op: 'eq', value: priority });
  if (equipment_id) conditions.push({ field: 'so.equipment_id', op: 'eq', value: equipment_id });
  if (client_id) conditions.push({ field: 'so.client_id', op: 'eq', value: client_id });

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
