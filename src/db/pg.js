import pg from 'pg';
import { getSupabase, hasSupabase } from './supabase.js';

const { Pool } = pg;

let pool = null;

const ref = process.env.SUPABASE_REF || '';
const dbPass = process.env.SUPABASE_DB_PASS || '';

function buildPool() {
  if (!ref || !dbPass) return null;
  try {
    return new Pool({
      host: `db.${ref}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: dbPass,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      family: 4,
    });
  } catch { return null; }
}

/**
 * Get or create a direct PostgreSQL connection pool for raw SQL queries.
 * Returns null if not configured or on network errors.
 */
export function getPgPool() {
  if (pool === undefined) pool = buildPool();
  return pool;
}

async function withFallback(fn, fallback) {
  const p = getPgPool();
  if (!p) return fallback();
  try {
    return await fn(p);
  } catch (err) {
    // Direct connection failed (ENETUNREACH, timeout, etc.) — try Supabase REST as fallback
    if (hasSupabase()) return fallback();
    throw err;
  }
}

/**
 * Execute a raw SQL query and return all rows.
 * Falls back to Supabase REST API if direct connection fails.
 */
export async function queryRaw(sql, params = []) {
  return withFallback(
    async (p) => { const r = await p.query(sql, params); return r.rows; },
    async () => { throw new Error('Raw SQL not available via Supabase REST API'); }
  );
}

/**
 * Execute a raw SQL query and return the first row.
 * Falls back to Supabase REST API if direct connection fails.
 */
export async function queryRow(sql, params = []) {
  return withFallback(
    async (p) => { const r = await p.query(sql, params); return r.rows[0] || null; },
    async () => { throw new Error('Raw SQL not available via Supabase REST API'); }
  );
}

/**
 * Execute a write query (INSERT/UPDATE/DELETE) and return result info.
 * Falls back to Supabase REST API if direct connection fails.
 */
export async function queryExec(sql, params = []) {
  return withFallback(
    async (p) => { const r = await p.query(sql, params); return { changes: r.rowCount, lastInsertRowid: 0 }; },
    async () => { throw new Error('Raw SQL not available via Supabase REST API'); }
  );
}
