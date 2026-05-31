import pg from 'pg';

const { Pool } = pg;

let pool = null;

const ref = process.env.SUPABASE_REF || 'xnlmdaqfxpwewspctfce';
const dbPass = process.env.SUPABASE_DB_PASS || 'zH2NaOjGwlmUipd0D4J9';

/**
 * Get or create a direct PostgreSQL connection pool for raw SQL queries
 */
export function getPgPool() {
  if (pool) return pool;

  const host = `db.${ref}.supabase.co`;

  pool = new Pool({
    host,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPass,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });

  return pool;
}

/**
 * Execute a raw SQL query and return all rows
 */
export async function queryRaw(sql, params = []) {
  const p = getPgPool();
  const result = await p.query(sql, params);
  return result.rows;
}

/**
 * Execute a raw SQL query and return the first row
 */
export async function queryRow(sql, params = []) {
  const p = getPgPool();
  const result = await p.query(sql, params);
  return result.rows[0] || null;
}

/**
 * Execute a write query (INSERT/UPDATE/DELETE) and return result info
 */
export async function queryExec(sql, params = []) {
  const p = getPgPool();
  const result = await p.query(sql, params);
  return {
    changes: result.rowCount,
    lastInsertRowid: 0, // PostgreSQL doesn't use lastInsertRowid
  };
}
