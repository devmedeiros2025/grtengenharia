/**
 * Local SQLite adapter — fallback quando Supabase não está configurado.
 * Implementa a mesma interface de `src/db/adapter.js` usando node:sqlite.
 */
import { getDb } from './schema.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripTableAlias(name) {
  return (name || '').replace(/\s+\w+$/, '').trim();
}

function stripColumnPrefix(col) {
  return col.replace(/^\w+\./, '');
}

function buildWhereClause(conditions) {
  if (!conditions || conditions.length === 0) return { sql: '', params: [] };

  const parts = [];
  const params = [];
  for (const { field, op, value } of conditions) {
    const cleanField = stripColumnPrefix(field);
    if (value === undefined || value === null) continue;
    switch (op) {
      case 'eq':   parts.push(`${cleanField} = ?`); params.push(value); break;
      case 'ne':   parts.push(`${cleanField} != ?`); params.push(value); break;
      case 'like': parts.push(`${cleanField} LIKE ?`); params.push(`%${value}%`); break;
      case 'gt':   parts.push(`${cleanField} > ?`); params.push(value); break;
      case 'gte':  parts.push(`${cleanField} >= ?`); params.push(value); break;
      case 'lt':   parts.push(`${cleanField} < ?`); params.push(value); break;
      case 'lte':  parts.push(`${cleanField} <= ?`); params.push(value); break;
      case 'in': {
        const vals = Array.isArray(value) ? value : [value];
        parts.push(`${cleanField} IN (${vals.map(() => '?').join(',')})`);
        params.push(...vals);
        break;
      }
      case 'or': {
        if (Array.isArray(value)) {
          const orParts = value.map(v => {
            const [f, o, val] = Array.isArray(v) ? v : [v.field, v.op, v.value];
            const cleanF = stripColumnPrefix(f);
            if (o === 'like') return `${cleanF} LIKE ?`;
            return `${cleanF} = ?`;
          });
          const orParams = value.map(v => {
            const val = Array.isArray(v) ? v[2] : v.value;
            if (Array.isArray(v) && v[1] === 'like') return `%${val}%`;
            return val;
          });
          parts.push(`(${orParts.join(' OR ')})`);
          params.push(...orParams);
        }
        break;
      }
    }
  }
  return { sql: parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '', params };
}

function formatRow(row) {
  if (!row) return null;
  // Ensure `row` is a plain object (not a node:sqlite internal)
  return { ...row };
}

// ── PUBLIC API ───────────────────────────────────────────────────────────────

export const localDb = {
  /**
   * Select rows
   */
  async select(table, { columns = '*', conditions = null, orderBy = null, limit = null, offset = null } = {}) {
    const db = getDb();
    const cleanTable = stripTableAlias(table);
    const { sql: whereSql, params } = buildWhereClause(conditions);

    // Strip table-alias prefixes from column references.
    // When the columns include JOIN references (e.g. "so.*, e.name as equipment_name"),
    // we can't resolve them locally — just fall back to '*' .
    let cleanColumns;
    if (/\.\*/.test(columns) || /\(/.test(columns)) {
      cleanColumns = '*';
    } else {
      cleanColumns = columns.replace(/\b\w+\./g, '');
    }

    let sql = `SELECT ${cleanColumns} FROM ${cleanTable} ${whereSql}`;

    if (orderBy) {
      const [col, dir] = Array.isArray(orderBy) ? orderBy : [orderBy, 'asc'];
      sql += ` ORDER BY ${stripColumnPrefix(col)} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
    }
    if (limit) sql += ` LIMIT ${limit}`;
    if (offset) sql += ` OFFSET ${offset}`;

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return (rows || []).map(formatRow);
  },

  /**
   * Get single row by ID
   */
  async get(table, id) {
    const db = getDb();
    const cleanTable = stripTableAlias(table);
    const stmt = db.prepare(`SELECT * FROM ${cleanTable} WHERE id = ?`);
    const row = stmt.get(id);
    return formatRow(row);
  },

  /**
   * Insert a row
   */
  async create(table, data) {
    const db = getDb();
    const cleanTable = stripTableAlias(table);
    const insertData = { ...data };
    if (insertData.updated_at === undefined) {
      insertData.updated_at = new Date().toISOString();
    }

    const keys = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = keys.map(() => '?').join(', ');

    const result = db.prepare(
      `INSERT INTO ${cleanTable} (${keys.join(', ')}) VALUES (${placeholders})`
    ).run(...values);

    return this.get(table, Number(result.lastInsertRowid));
  },

  /**
   * Update a row by ID
   */
  async update(table, id, data) {
    const db = getDb();
    const cleanTable = stripTableAlias(table);
    const updateData = { ...data, updated_at: new Date().toISOString() };
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

    if (Object.keys(updateData).length === 0) return this.get(table, id);

    const setClause = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updateData), id];

    db.prepare(`UPDATE ${cleanTable} SET ${setClause} WHERE id = ?`).run(...values);
    return this.get(table, id);
  },

  /**
   * Delete a row by ID
   */
  async delete(table, id) {
    const db = getDb();
    const cleanTable = stripTableAlias(table);
    const result = db.prepare(`DELETE FROM ${cleanTable} WHERE id = ?`).run(id);
    return result.changes > 0;
  },

  /**
   * Count rows
   */
  async count(table, conditions = null) {
    const db = getDb();
    const cleanTable = stripTableAlias(table);
    const { sql: whereSql, params } = buildWhereClause(conditions);
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${cleanTable} ${whereSql}`);
    const row = stmt.get(...params);
    return row ? Number(row.count) : 0;
  },

  /**
   * Paginated list with filters
   */
  async paginate(table, { conditions = null, page = 1, limit = 50, orderBy = null, columns = '*' } = {}) {
    const cleanTable = stripTableAlias(table);
    const offset = (page - 1) * limit;

    const total = await this.count(cleanTable, conditions);
    const data = await this.select(cleanTable, { columns, conditions, orderBy, limit, offset });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Raw SQL query — returns array of rows for SELECT, run result otherwise
   */
  async raw(sql, params = []) {
    const db = getDb();
    const trimmed = sql.trim().toUpperCase();
    const stmt = db.prepare(sql);

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('PRAGMA')) {
      const rows = stmt.all(...params);
      return (rows || []).map(formatRow);
    }
    return stmt.run(...params);
  },

  /**
   * Raw SQL returning single row
   */
  async row(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    const row = stmt.get(...params);
    return formatRow(row);
  },

  /**
   * Raw SQL execute (INSERT/UPDATE/DELETE)
   */
  async exec(sql, params = []) {
    const db = getDb();
    const result = db.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid || 0) };
  },

  /**
   * Run a transaction with a Supabase-like proxy
   */
  async transaction(callback) {
    const db = getDb();
    const proxy = buildSupabaseLikeProxy(localDb);
    db.exec('BEGIN');
    try {
      const result = await callback(proxy);
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },
};

/**
 * Build a Supabase-like proxy for use inside transactions.
 * Wraps the local-adapter methods in a chainable query builder.
 */
function buildSupabaseLikeProxy(local) {
  return {
    from(table) {
      return new SupabaseQuery(table, local);
    },
  };
}

class SupabaseQuery {
  constructor(table, local) {
    this.table = table;
    this.local = local;
    this.filters = [];
    this._selectCols = '*';
    this._single = false;
    this._limitVal = null;
    this._offsetVal = null;
    this._orderCol = null;
    this._orderDir = 'ASC';
  }

  select(cols) {
    this._selectCols = cols || '*';
    return this;
  }

  insert(data) {
    this._op = 'insert';
    this._insertData = data;
    return this;
  }

  update(data) {
    this._op = 'update';
    this._updateData = data;
    return this;
  }

  delete() {
    this._op = 'delete';
    return this;
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  limit(n) {
    this._limitVal = n;
    return this;
  }

  order(col, opts) {
    this._orderCol = col;
    this._orderDir = opts?.ascending !== false ? 'ASC' : 'DESC';
    return this;
  }

  range(start, end) {
    this._offsetVal = start;
    this._limitVal = end - start + 1;
    return this;
  }

  async _exec() {
    const db = getDb();
    if (this._op === 'insert') {
      const result = await this.local.create(this.table, this._insertData);
      return { data: result, error: null };
    }
    if (this._op === 'update') {
      const idFilter = this.filters.find(f => f.field === 'id');
      if (idFilter) {
        const result = await this.local.update(this.table, idFilter.value, this._updateData);
        return { data: result ? [result] : [], error: null };
      }
      const setClauses = Object.entries(this._updateData).map(([k]) => `${k} = ?`).join(', ');
      const values = Object.values(this._updateData);
      const whereClauses = this.filters.map(f => `${f.field} = ?`).join(' AND ');
      const whereValues = this.filters.map(f => f.value);
      db.prepare(`UPDATE ${this.table} SET ${setClauses} WHERE ${whereClauses}`).run(...values, ...whereValues);
      return { data: [], error: null };
    }
    if (this._op === 'delete') {
      const whereClauses = this.filters.map(f => `${f.field} = ?`).join(' AND ');
      const values = this.filters.map(f => f.value);
      const info = db.prepare(`DELETE FROM ${this.table} WHERE ${whereClauses}`).run(...values);
      return { error: null, count: info.changes };
    }
    let sql = `SELECT ${this._selectCols} FROM ${this.table}`;
    const params = [];
    if (this.filters.length > 0) {
      sql += ' WHERE ' + this.filters.map(f => { params.push(f.value); return `${f.field} = ?`; }).join(' AND ');
    }
    if (this._orderCol) {
      sql += ` ORDER BY ${this._orderCol} ${this._orderDir}`;
    }
    if (this._limitVal) {
      sql += ` LIMIT ${this._limitVal}`;
    }
    if (this._offsetVal) {
      sql += ` OFFSET ${this._offsetVal}`;
    }
    const rows = db.prepare(sql).all(...params);
    if (this._single) {
      return { data: rows[0] || null, error: null };
    }
    return { data: rows, error: null };
  }

  then(resolve, reject) {
    return this._exec().then(resolve, reject);
  }
}

export default localDb;
