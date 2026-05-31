import db from '../db/adapter.js';

export async function listCompanies(filters = {}) {
  const conditions = [];
  if (filters.search) {
    conditions.push({ field: 'name', op: 'like', value: filters.search });
  }
  if (filters.status) {
    conditions.push({ field: 'status', op: 'eq', value: filters.status });
  }
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;

  const result = await db.paginate('companies', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  // Apply OR search for email and cnpj since adapter only handles single-field conditions
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result.data = result.data.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.cnpj || '').toLowerCase().includes(q)
    );
    result.total = result.data.length;
    result.totalPages = Math.ceil(result.total / limit);
  }

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
