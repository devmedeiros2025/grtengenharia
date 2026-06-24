import db from '../db/adapter.js';

export async function listContracts({ status, type, company_id, equipment_id, search, page = 1, limit = 50 } = {}) {
  const conditions = [];
  if (status) conditions.push({ field: 'ct.status', op: 'eq', value: status });
  if (type) conditions.push({ field: 'ct.type', op: 'eq', value: type });
  if (company_id) conditions.push({ field: 'ct.company_id', op: 'eq', value: company_id });
  if (equipment_id) conditions.push({ field: 'ct.equipment_id', op: 'eq', value: equipment_id });

  // Multi-field search via raw SQL OR
  if (search) {
    const where = [];
    const params = [];
    const q = `%${search}%`;
    where.push('(ct.title LIKE ? OR ct.notes LIKE ?)');
    params.push(q, q);
    if (status) { where.push('ct.status = ?'); params.push(status); }
    if (type) { where.push('ct.type = ?'); params.push(type); }
    if (company_id) { where.push('ct.company_id = ?'); params.push(company_id); }
    if (equipment_id) { where.push('ct.equipment_id = ?'); params.push(equipment_id); }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const countRow = await db.row(
      `SELECT COUNT(*) as total FROM contracts ct LEFT JOIN equipment e ON ct.equipment_id = e.id LEFT JOIN companies c ON ct.company_id = c.id ${whereClause}`,
      params
    );
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT ct.*, e.name as equipment_name, c.name as company_name FROM contracts ct LEFT JOIN equipment e ON ct.equipment_id = e.id LEFT JOIN companies c ON ct.company_id = c.id ${whereClause} ORDER BY ct.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { contracts: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const result = await db.paginate('contracts ct', {
    columns: 'ct.*, e.name as equipment_name, c.name as company_name',
    conditions: conditions.length > 0 ? conditions : null,
    joins: [
      { table: 'equipment e', foreignKey: 'ct.equipment_id', columns: 'name as equipment_name' },
      { table: 'companies c', foreignKey: 'ct.company_id', columns: 'name as company_name' },
    ],
    page, limit,
    orderBy: ['ct.created_at', 'desc'],
  });

  return { contracts: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages };
}

export async function getContract(id) {
  return db.get('contracts', id);
}

export async function createContract(data) {
  return db.create('contracts', {
    title: data.title, company_id: data.company_id || null, equipment_id: data.equipment_id || null,
    type: data.type || 'rental', value: data.value || 0, start_date: data.start_date || null,
    end_date: data.end_date || null, status: data.status || 'active', notes: data.notes || null, file: data.file || null,
  });
}

export async function updateContract(id, data) {
  const existing = await db.get('contracts', id);
  if (!existing) return null;
  return db.update('contracts', id, data);
}

export async function deleteContract(id) {
  const existing = await db.get('contracts', id);
  if (!existing) return false;
  return db.delete('contracts', id);
}