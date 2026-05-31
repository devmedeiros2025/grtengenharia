import { getDb } from './schema.js';
import { getSupabase, hasSupabase } from './supabase.js';

const isPG = hasSupabase();

// ── Helpers ──────────────────────────────────────────────────────────────────

function sqliteDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString().replace('T', ' ').substring(0, 19);
  return date;
}

function pgDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString();
  return date;
}

function pgNow() {
  return new Date().toISOString();
}

function sqliteNow() {
  return "datetime('now')";
}

// ── Build WHERE clause (SQLite) ──────────────────────────────────────────────

function buildWhere(conditions, params = []) {
  if (!conditions || conditions.length === 0) return ['', []];
  const clauses = [];
  const values = [];
  for (const { field, op, value } of conditions) {
    if (value === undefined || value === null) continue;
    switch (op) {
      case 'eq': clauses.push(`${field} = ?`); values.push(value); break;
      case 'ne': clauses.push(`${field} != ?`); values.push(value); break;
      case 'like': clauses.push(`${field} LIKE ?`); values.push(`%${value}%`); break;
      case 'gt': clauses.push(`${field} > ?`); values.push(value); break;
      case 'gte': clauses.push(`${field} >= ?`); values.push(value); break;
      case 'lt': clauses.push(`${field} < ?`); values.push(value); break;
      case 'lte': clauses.push(`${field} <= ?`); values.push(value); break;
      case 'in': clauses.push(`${field} IN (${value.map(() => '?').join(',')})`); values.push(...value); break;
      case 'or': {
        const sub = value.map(v => {
          const [f, o, val] = v;
          if (o === 'like') return `${f} LIKE ?`;
          return `${f} = ?`;
        }).join(' OR ');
        clauses.push(`(${sub})`);
        for (const v of value) {
          if (v[1] === 'like') values.push(`%${v[2]}%`);
          else values.push(v[2]);
        }
        break;
      }
      case 'raw': clauses.push(value); break;
      default: clauses.push(`${field} = ?`); values.push(value); break;
    }
  }
  if (clauses.length === 0) return ['', []];
  for (const p of params) values.push(p);
  return [`WHERE ${clauses.join(' AND ')}`, values];
}

/**
 * Build Supabase query from conditions
 */
function applyFilters(query, conditions) {
  if (!conditions) return query;
  for (const { field, op, value } of conditions) {
    if (value === undefined || value === null) continue;
    switch (op) {
      case 'eq': query = query.eq(field, value); break;
      case 'ne': query = query.neq(field, value); break;
      case 'like': query = query.ilike(field, `%${value}%`); break;
      case 'gt': query = query.gt(field, value); break;
      case 'gte': query = query.gte(field, value); break;
      case 'lt': query = query.lt(field, value); break;
      case 'lte': query = query.lte(field, value); break;
      case 'in': query = query.in(field, value); break;
      case 'or': {
        // Supabase: pass raw OR filter string
        const orParts = value.map(v => {
          const [f, o, val] = v;
          if (o === 'like') return `${f}.ilike.%${val}%`;
          return `${f}.eq.${val}`;
        });
        query = query.or(orParts.join(','));
        break;
      }
      // 'raw' is ignored for Supabase - use direct Supabase queries for complex conditions
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
    if (isPG) {
      let query = getSupabase().from(table).select(columns);
      if (conditions) query = applyFilters(query, conditions);
      if (joins) {
        for (const j of joins) {
          // joins = [{ table: 'companies', foreignKey: 'company_id', columns: 'name as company_name' }]
          query = query.select(`${columns}, ${j.table}(${j.columns})`);
        }
      }
      if (orderBy) {
        const [col, dir] = Array.isArray(orderBy) ? orderBy : [orderBy, 'asc'];
        query = query.order(col, { ascending: dir !== 'desc' });
      }
      if (limit) query = query.limit(limit);
      if (offset) query = query.range(offset, offset + (limit || 10) - 1);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    } else {
      const db = getDb();
      const [whereClause, params] = buildWhere(conditions);
      let sql = `SELECT ${columns} FROM ${table}`;
      if (joins) {
        for (const j of joins) {
          sql += ` LEFT JOIN ${j.table} ON ${table}.${j.foreignKey || `${j.table.slice(0, -1)}_id`} = ${j.table}.id`;
        }
      }
      sql += ` ${whereClause}`;
      if (orderBy) {
        const col = Array.isArray(orderBy) ? orderBy[0] : orderBy;
        const dir = Array.isArray(orderBy) ? orderBy[1] || 'ASC' : 'ASC';
        sql += ` ORDER BY ${col} ${dir}`;
      }
      if (limit) { sql += ' LIMIT ?'; params.push(limit); }
      if (offset) { sql += ' OFFSET ?'; params.push(offset); }
      return db.prepare(sql).all(...params);
    }
  },

  /**
   * Get single row by ID
   */
  async get(table, id) {
    if (isPG) {
      const { data, error } = await getSupabase().from(table).select('*').eq('id', id).limit(1);
      if (error) throw new Error(error.message);
      return data?.[0] || null;
    } else {
      const db = getDb();
      return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) || null;
    }
  },

  /**
   * Insert a row
   */
  async create(table, data) {
    if (isPG) {
      // Convert dates
      const pgData = { ...data };
      if (pgData.updated_at === undefined) pgData.updated_at = pgNow();
      const { data: result, error } = await getSupabase().from(table).insert(pgData).select();
      if (error) throw new Error(error.message);
      return result?.[0] || null;
    } else {
      const db = getDb();
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(',');
      const result = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`).run(...values);
      if (table === 'tasks' || table === 'companies' || table === 'equipment' || table === 'contracts' || table === 'service_orders') {
        return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(Number(result.lastInsertRowid));
      }
      return { id: Number(result.lastInsertRowid), ...data };
    }
  },

  /**
   * Update a row by ID
   */
  async update(table, id, data) {
    if (isPG) {
      const pgData = { ...data };
      pgData.updated_at = pgNow();
      // Remove undefined values
      Object.keys(pgData).forEach(k => pgData[k] === undefined && delete pgData[k]);
      if (Object.keys(pgData).length === 0) return this.get(table, id);
      const { data: result, error } = await getSupabase().from(table).update(pgData).eq('id', id).select();
      if (error) throw new Error(error.message);
      return result?.[0] || null;
    } else {
      const db = getDb();
      const sets = [];
      const params = [];
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          sets.push(`${key} = ?`);
          params.push(value);
        }
      }
      if (sets.length === 0) return this.get(table, id);
      // Only set updated_at if the table has that column (caller includes it in data)
      params.push(id);
      db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    }
  },

  /**
   * Delete a row by ID
   */
  async delete(table, id) {
    if (isPG) {
      const { error, count } = await getSupabase().from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return count !== 0;
    } else {
      const db = getDb();
      const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      return result.changes > 0;
    }
  },

  /**
   * Count rows
   */
  async count(table, conditions = null) {
    if (isPG) {
      let query = getSupabase().from(table).select('*', { count: 'exact', head: true });
      if (conditions) query = applyFilters(query, conditions);
      const { count, error } = await query;
      if (error) throw new Error(error.message);
      return count || 0;
    } else {
      const db = getDb();
      const [whereClause, params] = buildWhere(conditions);
      const row = db.prepare(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`).get(...params);
      return row.total;
    }
  },

  /**
   * Paginated list with filters
   */
  async paginate(table, { conditions = null, page = 1, limit = 50, orderBy = null, joins = null, columns = '*' } = {}) {
    const offset = (page - 1) * limit;

    if (isPG) {
      // Count
      let countQuery = getSupabase().from(table).select('*', { count: 'exact', head: true });
      if (conditions) countQuery = applyFilters(countQuery, conditions);
      const { count, error: countError } = await countQuery;
      if (countError) throw new Error(countError.message);
      const total = count || 0;

      // Data
      let query = getSupabase().from(table).select(columns);
      if (conditions) query = applyFilters(query, conditions);
      if (joins) {
        for (const j of joins) {
          query = query.select(`*, ${j.table}(${j.columns})`);
        }
      }
      if (orderBy) {
        const [col, dir] = Array.isArray(orderBy) ? orderBy : [orderBy, 'asc'];
        query = query.order(col, { ascending: dir !== 'desc' });
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
    } else {
      const syncDb = getDb();
      const [whereClause, queryParams] = buildWhere(conditions);

      // Extract alias from table name (e.g. "service_orders so" -> alias "so", table "service_orders")
      const tableParts = table.split(/\s+/);
      const tableAlias = tableParts[1] || tableParts[0];
      const tableName = tableParts[0];

      // Count
      let countSql = `SELECT COUNT(*) as total FROM ${tableName} ${tableAlias !== tableName ? tableAlias : ''}`;
      if (joins) {
        for (const j of joins) {
          const jParts = j.table.split(/\s+/);
          const jAlias = jParts[1] || jParts[0];
          countSql += ` LEFT JOIN ${jParts[0]} ${jAlias !== jParts[0] ? jAlias : ''} ON ${j.foreignKey || `${tableAlias}.${jParts[0].slice(0, -1)}_id`} = ${jAlias}.id`;
        }
      }
      const countRow = syncDb.prepare(`${countSql} ${whereClause}`).get(...queryParams);
      const total = countRow.total;
      const totalPages = Math.ceil(total / limit);

      // Data with joins
      let sql = `SELECT ${columns} FROM ${tableName} ${tableAlias !== tableName ? tableAlias : ''}`;
      if (joins) {
        for (const j of joins) {
          const jParts = j.table.split(/\s+/);
          const jAlias = jParts[1] || jParts[0];
          sql += ` LEFT JOIN ${jParts[0]} ${jAlias !== jParts[0] ? jAlias : ''} ON ${j.foreignKey || `${tableAlias}.${jParts[0].slice(0, -1)}_id`} = ${jAlias}.id`;
        }
      }
      sql += ` ${whereClause}`;
      if (orderBy) {
        const col = Array.isArray(orderBy) ? orderBy[0] : orderBy;
        const dir = Array.isArray(orderBy) ? orderBy[1] || 'ASC' : 'ASC';
        sql += ` ORDER BY ${col} ${dir}`;
      }
      sql += ' LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);

      const rows = syncDb.prepare(sql).all(...queryParams);
      return { data: rows, total, page, limit, totalPages };
    }
  },

  /**
   * Raw SQL query (SQLite only, or Supabase via RPC if 'exec_sql' proc exists)
   * For Supabase, prefer using the db methods above or direct Supabase queries.
   */
  async raw(sql, params = []) {
    if (isPG) {
      // Try to use RPC for raw SQL
      try {
        const { data, error } = await getSupabase().rpc('exec_sql', { query_text: sql, params });
        if (error) throw error;
        return data;
      } catch (err) {
        throw new Error(`Raw SQL not available in Supabase mode. Create an 'exec_sql' RPC or use db methods. Original: ${err.message}`);
      }
    } else {
      const db = getDb();
      return db.prepare(sql).all(...params);
    }
  },

  /**
   * Raw SQL query returning single row (SQLite only)
   */
  async row(sql, params = []) {
    if (isPG) {
      try {
        const { data, error } = await getSupabase().rpc('exec_sql', { query_text: sql, params });
        if (error) throw error;
        return Array.isArray(data) ? data[0] : data;
      } catch (err) {
        throw new Error(`Row query not available in Supabase mode. Create an 'exec_sql' RPC. Original: ${err.message}`);
      }
    } else {
      const db = getDb();
      return db.prepare(sql).get(...params);
    }
  },

  /**
   * Raw SQL execute (INSERT/UPDATE/DELETE - SQLite only)
   * Returns { changes, lastInsertRowid }
   */
  async exec(sql, params = []) {
    if (isPG) {
      throw new Error('Use db.create/update/delete for Supabase mode, or create an exec_sql RPC.');
    } else {
      const db = getDb();
      const result = db.prepare(sql).run(...params);
      return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
    }
  },

  /**
   * Run a transaction (SQLite only - uses db.transaction)
   * For Supabase, pass a callback that receives Supabase client
   */
  async transaction(callback) {
    if (isPG) {
      // Supabase JS client doesn't support transactions directly
      // Execute callback with Supabase client as argument
      return callback(getSupabase());
    } else {
      const db = getDb();
      const tx = db.transaction(callback);
      return tx();
    }
  },
};

export default db;
