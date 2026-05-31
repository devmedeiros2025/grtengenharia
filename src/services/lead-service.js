import db from '../db/adapter.js';
export async function createLead(data) {
  const { name, email, phone, company, source = 'api', campaign = null, message = null, metadata = '{}' } = data;

  if (!name || name.trim().length === 0) {
    throw new Error('Nome é obrigatório');
  }

  const result = await db.create('leads', {
    name: name.trim(), email: email || null, phone: phone || null,
    company: company || null, source, campaign: campaign || null,
    message: message || null,
    metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
  });

  const lead = await getLeadById(result?.id);
  return lead;
}

export async function getLeadById(id) {
  const row = await db.get('leads', id);
  if (!row) return null;
  return formatLead(row);
}

export async function listLeads({ status, source, search, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const params = [];

  if (status) conditions.push({ field: 'status', op: 'eq', value: status });
  if (source) conditions.push({ field: 'source', op: 'eq', value: source });

  const offset = (page - 1) * limit;

  // For search with OR, use filtered results
  if (search) {
    const where = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (source) { where.push('source = ?'); params.push(source); }
    if (search) {
      const q = `%${search}%`;
      where.push('(name LIKE ? OR email LIKE ? OR company LIKE ? OR phone LIKE ?)');
      params.push(q, q, q, q);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.row(`SELECT COUNT(*) as total FROM leads ${whereClause}`, params);
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT * FROM leads ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      leads: rows.map(formatLead),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // No search - use structured pagination
  const result = await db.paginate('leads', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  return {
    leads: result.data.map(formatLead),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}

export async function updateLead(id, data) {
  const lead = await getLeadById(id);
  if (!lead) return null;

  const updateData = {};
  const allowed = ['name', 'email', 'phone', 'company', 'status', 'score', 'message', 'metadata'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updateData[field] = field === 'metadata' && typeof data[field] === 'object'
        ? JSON.stringify(data[field])
        : data[field];
    }
  }

  if (Object.keys(updateData).length === 0) return lead;

  await db.update('leads', id, updateData);
  const updated = await getLeadById(id);

  return updated;
}

export async function deleteLead(id) {
  const lead = await getLeadById(id);
  if (!lead) return false;
  return db.delete('leads', id);
}

export async function getLeadsStats() {
  const [rows, totalRow, todayRow] = await Promise.all([
    db.raw('SELECT status, COUNT(*) as count FROM leads GROUP BY status'),
    db.row('SELECT COUNT(*) as t FROM leads'),
    db.row("SELECT COUNT(*) as t FROM leads WHERE created_at::date = CURRENT_DATE"),
  ]);

  const total = totalRow?.t || 0;
  const today = todayRow?.t || 0;

  const stats = { total, today, byStatus: {} };
  for (const r of rows || []) {
    stats.byStatus[r.status] = r.count;
  }
  return stats;
}

function formatLead(row) {
  return {
    ...row,
    metadata: tryParseJson(row.metadata),
  };
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
