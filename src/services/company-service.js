import db from '../db/adapter.js';

export async function listCompanies(filters = {}) {
  const conditions = [];
  if (filters.status) {
    conditions.push({ field: 'status', op: 'eq', value: filters.status });
  }
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;

  // Multi-field search via raw SQL OR
  if (filters.search) {
    const q = `%${filters.search}%`;
    const where = [];
    const params = [q, q, q];
    where.push('(name LIKE ? OR email LIKE ? OR cnpj LIKE ?)');
    if (filters.status) { where.push('status = ?'); params.push(filters.status); }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const countRow = await db.row(`SELECT COUNT(*) as total FROM companies ${whereClause}`, params);
    const total = countRow?.total || 0;
    const offset = (page - 1) * limit;
    const rows = await db.raw(
      `SELECT * FROM companies ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      companies: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  const result = await db.paginate('companies', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  return { companies: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages };
}

export async function getCompany(id) {
  return db.get('companies', id);
}

export async function createCompany(data) {
  return db.create('companies', {
    name: data.name, email: data.email || null, phone: data.phone || null,
    website: data.website || null, cnpj: data.cnpj || null, address: data.address || null,
    city: data.city || null, state: data.state || null, zip: data.zip || null,
    segment: data.segment || null, notes: data.notes || null,
    status: data.status || 'active',
  });
}

export async function updateCompany(id, data) {
  const existing = await db.get('companies', id);
  if (!existing) return null;
  return db.update('companies', id, data);
}

export async function deleteCompany(id) {
  return db.delete('companies', id);
}

export async function getCompanyStats() {
  const [total, active] = await Promise.all([
    db.count('companies'),
    db.count('companies', [{ field: 'status', op: 'eq', value: 'active' }]),
  ]);
  return { total, active };
}
