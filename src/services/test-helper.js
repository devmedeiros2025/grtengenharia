/**
 * Test Helper — configura um banco SQLite isolado para testes.
 * Uso: import { setupTestDb, teardownTestDb } from './test-helper.js';
 */
import { unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Prepara ambiente de teste: DB isolado, força SQLite local
 * @param {string} importMetaUrl - import.meta.url do arquivo de teste
 * @returns {string} path do banco de teste
 */
export function setupTestDb(importMetaUrl) {
  const testName = basename(fileURLToPath(importMetaUrl), '.test.js');
  const testDbPath = join(__dirname, '..', '..', 'data', `crm-test-${testName}.db`);

  // Signal to adapter that we're in test mode
  process.env.TEST = 'true';
  process.env.DB_PATH = testDbPath;

  // Ensure data directory exists
  const dataDir = dirname(testDbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Clean up any existing test DB
  cleanupDb(testDbPath);

  return testDbPath;
}

/**
 * Limpa arquivos de banco de teste
 */
export function teardownTestDb(testDbPath) {
  cleanupDb(testDbPath);
}

function cleanupDb(dbPath) {
  try { unlinkSync(dbPath); } catch {}
  try { unlinkSync(dbPath + '-wal'); } catch {}
  try { unlinkSync(dbPath + '-shm'); } catch {}
}
