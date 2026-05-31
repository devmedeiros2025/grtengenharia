import db from '../db/adapter.js';

export async function listContracts({ status, type, company_id, equipment_id, page = 1, limit = 50 } = {}) {
  const conditions = [];
  if (status) conditions.push({ field: 'ct.status', op: 'eq', value: status });
  if (type) conditions.push({ field: 'ct.type', op: 'eq', value: type });
  if (company_id) conditions.push({ field: 'ct.company_id', op: 'eq', value: company_id });
  if (equipment_id) conditions.push({ field: 'ct.equipment_id', op: 'eq', value: equipment_id });

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
