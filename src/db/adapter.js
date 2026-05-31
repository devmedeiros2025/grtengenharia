import { getSupabase } from './supabase.js';
import { queryRaw, queryRow, queryExec } from './pg.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function pgDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString();
  return date;
}

function pgNow() {
  return new Date().toISOString();
}

/**
 * Strip SQL table alias (e.g., 'deals d' -> 'deals', 'tasks t' -> 'tasks')
 */
function stripAlias(name) {
  return name.replace(/\s+\w+$/, '').trim();
}

/**
 * Strip column table prefix (e.g., 'd.updated_at' -> 'updated_at', 'c.name' -> 'name')
 */
function stripPrefix(col) {
  return col.replace(/^\w+\./, '');
}

/**
 * Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
 */
function toPgSql(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

/**
 * Build Supabase query from conditions
 */
function applyFilters(query, conditions) {
  if (!conditions) return query;
  for (const { field, op, value } of conditions) {
    const cleanField = stripPrefix(field); // strip table prefix (d.stage -> stage)
    if (value === undefined || value === null) continue;
    switch (op) {
      case 'eq': query = query.eq(cleanField, value); break;
      case 'ne': query = query.neq(cleanField, value); break;
      case 'like': query = query.ilike(cleanField, `%${value}%`); break;
      case 'gt': query = query.gt(cleanField, value); break;
      case 'gte': query = query.gte(cleanField, value); break;
      case 'lt': query = query.lt(cleanField, value); break;
      case 'lte': query = query.lte(cleanField, value); break;
      case 'in': query = query.in(cleanField, value); break;
      case 'or': {
        const orParts = value.map(v => {
          const [f, o, val] = v;
          const cleanF = stripPrefix(f);
          if (o === 'like') return `${cleanF}.ilike.%${val}%`;
          return `${cleanF}.eq.${val}`;
        });
        query = query.or(orParts.join(','));
        break;
      }
    }
  }
  return query;
}

// ── PUBLIC API ───────────────────────────────────────────────────────────────

export const db = {
  /**
   * Select rows
   */
  async select(table, { columns = '*', conditions = null, orderBy = null, limit = null, offset = null, joins = null } = {}) {
    const cleanTable = stripAlias(table);
    let query = getSupabase().from(cleanTable).select(columns);
    if (conditions) query = applyFilters(query, conditions);
    if (joins) {
      for (const j of joins) {
        const jt = stripAlias(j.table);
        query = query.select(`*, ${jt}(${j.columns})`);
      }
    }
    if (orderBy) {
      const [col, dir] = Array.isArray(orderBy) ? orderBy : [orderBy, 'asc'];
      query = query.order(stripPrefix(col), { ascending: dir !== 'desc' });
    }
    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + (limit || 10) - 1);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Get single row by ID
   */
  async get(table, id) {
    const { data, error } = await getSupabase().from(stripAlias(table)).select('*').eq('id', id).limit(1);
    if (error) throw new Error(error.message);
    return data?.[0] || null;
  },

  /**
   * Insert a row
   */
  async create(table, data) {
    const pgData = { ...data };
    if (pgData.updated_at === undefined) pgData.updated_at = pgNow();
    const { data: result, error } = await getSupabase().from(table).insert(pgData).select();
    if (error) throw new Error(error.message);
    return result?.[0] || null;
  },

  /**
   * Update a row by ID
   */
  async update(table, id, data) {
    const pgData = { ...data };
    pgData.updated_at = pgNow();
    Object.keys(pgData).forEach(k => pgData[k] === undefined && delete pgData[k]);
    if (Object.keys(pgData).length === 0) return this.get(table, id);
    const { data: result, error } = await getSupabase().from(table).update(pgData).eq('id', id).select();
    if (error) throw new Error(error.message);
    return result?.[0] || null;
  },

  /**
   * Delete a row by ID
   */
  async delete(table, id) {
    const { error, count } = await getSupabase().from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
    return count !== 0;
  },

  /**
   * Count rows
   */
  async count(table, conditions = null) {
    let query = getSupabase().from(table).select('*', { count: 'exact', head: true });
    if (conditions) query = applyFilters(query, conditions);
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count || 0;
  },

  /**
   * Paginated list with filters
   */
  async paginate(table, { conditions = null, page = 1, limit = 50, orderBy = null, joins = null, columns = '*' } = {}) {
    const cleanTable = stripAlias(table);
    const offset = (page - 1) * limit;

    // Build select columns with joins
    let selectCols = columns;
    if (joins && joins.length > 0) {
      selectCols = '*';
      for (const j of joins) {
        selectCols += `, ${stripAlias(j.table)}(${j.columns})`;
      }
    }

    // Count
    let countQuery = getSupabase().from(cleanTable).select('*', { count: 'exact', head: true });
    if (conditions) countQuery = applyFilters(countQuery, conditions);
    const { count, error: countError } = await countQuery;
    if (countError) throw new Error(countError.message);
    const total = count || 0;

    // Data
    let query = getSupabase().from(cleanTable).select(selectCols);
    if (conditions) query = applyFilters(query, conditions);
    if (orderBy) {
      const [col, dir] = Array.isArray(orderBy) ? orderBy : [orderBy, 'asc'];
      query = query.order(stripPrefix(col), { ascending: dir !== 'desc' });
    }
    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return {
      data: data || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Raw SQL query (returns array of rows)
   */
  async raw(sql, params = []) {
    return queryRaw(toPgSql(sql), params);
  },

  /**
   * Raw SQL query returning single row
   */
  async row(sql, params = []) {
    return queryRow(toPgSql(sql), params);
  },

  /**
   * Raw SQL execute (INSERT/UPDATE/DELETE)
   */
  async exec(sql, params = []) {
    return queryExec(toPgSql(sql), params);
  },

  /**
   * Run a transaction (callback receives Supabase client)
   */
  async transaction(callback) {
    return callback(getSupabase());
  },
};

export default db;
