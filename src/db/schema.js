import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

let db;

export function getDb() {
  if (db) return db;

  const dir = dirname(config.dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new DatabaseSync(config.dbPath);
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec('PRAGMA busy_timeout=5000');

  migrate();
  return db;
}

function migrate() {
  logger.info('Running database migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT,
      phone       TEXT,
      company     TEXT,
      source      TEXT DEFAULT 'api',
      campaign    TEXT,
      message     TEXT,
      status      TEXT DEFAULT 'new',
      score       INTEGER DEFAULT 0,
      metadata    TEXT DEFAULT '{}',
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_inbound (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      token       TEXT NOT NULL UNIQUE,
      source      TEXT,
      is_active   INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_outbound (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      token       TEXT,
      event       TEXT NOT NULL,
      is_active   INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      direction       TEXT NOT NULL,
      webhook_id      INTEGER,
      source          TEXT,
      payload         TEXT,
      response_status INTEGER,
      response_body   TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      key         TEXT NOT NULL UNIQUE,
      is_active   INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Companies (HubSpot-inspired) ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT,
      phone       TEXT,
      website     TEXT,
      cnpj        TEXT,
      address     TEXT,
      city        TEXT,
      state       TEXT,
      zip         TEXT,
      segment     TEXT,
      notes       TEXT,
      status      TEXT DEFAULT 'active',
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Deals / Pipeline (Bitrix24-inspired) ─────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      value         REAL DEFAULT 0,
      currency      TEXT DEFAULT 'BRL',
      stage         TEXT DEFAULT 'prospecting',
      probability   INTEGER DEFAULT 10,
      company_id    INTEGER,
      contact_name  TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      source        TEXT,
      notes         TEXT,
      closed_at     TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Tasks (universal) ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT,
      status      TEXT DEFAULT 'pending',
      priority    TEXT DEFAULT 'medium',
      due_date    TEXT,
      deal_id     INTEGER,
      company_id  INTEGER,
      assigned_to TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Deals pipeline stages config ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      stage_key   TEXT NOT NULL UNIQUE,
      probability INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      color       TEXT DEFAULT '#6b7280'
    );
  `);

  // Seed default pipeline stages if empty
  const stageCount = db.prepare('SELECT COUNT(*) as c FROM pipeline_stages').get();
  if (stageCount.c === 0) {
    const stages = [
      ['Prospecção', 'prospecting', 10, 0, '#f5a623'],
      ['Qualificação', 'qualification', 25, 1, '#3b82f6'],
      ['Proposta', 'proposal', 50, 2, '#8b5cf6'],
      ['Negociação', 'negotiation', 75, 3, '#ec4899'],
      ['Fechado Ganho', 'won', 100, 4, '#10b981'],
      ['Fechado Perdido', 'lost', 0, 5, '#ef4444'],
    ];
    const insert = db.prepare('INSERT INTO pipeline_stages (name, stage_key, probability, order_index, color) VALUES (?, ?, ?, ?, ?)');
    for (const s of stages) insert.run(...s);
  }

  // ── Attachments ───────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id       INTEGER,
      company_id    INTEGER,
      deal_id       INTEGER,
      contract_id   INTEGER,
      filename      TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type     TEXT DEFAULT 'application/octet-stream',
      size          INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migration: add contract_id if missing (existing DBs)
  try { db.exec('ALTER TABLE attachments ADD COLUMN contract_id INTEGER'); } catch {}

  // ── Equipment ─────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS equipment (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      type          TEXT,
      brand         TEXT,
      model         TEXT,
      plate         TEXT,
      year          INTEGER,
      status        TEXT DEFAULT 'available',
      daily_rate    REAL DEFAULT 0,
      photo         TEXT,
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Service Orders ────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_orders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      description   TEXT,
      equipment_id  INTEGER,
      client_id     INTEGER,
      status        TEXT DEFAULT 'open',
      priority      TEXT DEFAULT 'medium',
      opened_at     TEXT DEFAULT (datetime('now')),
      closed_at     TEXT,
      value         REAL DEFAULT 0,
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Contracts ─────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS contracts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      company_id    INTEGER,
      equipment_id  INTEGER,
      type          TEXT DEFAULT 'rental',
      value         REAL DEFAULT 0,
      start_date    TEXT,
      end_date      TEXT,
      status        TEXT DEFAULT 'active',
      notes         TEXT,
      file          TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Notifications ─────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL DEFAULT 'info',
      message     TEXT NOT NULL,
      link        TEXT,
      is_read     INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Invoices / Financeiro ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id   INTEGER,
      company_id    INTEGER,
      invoice_number TEXT NOT NULL,
      value         REAL DEFAULT 0,
      issue_date    TEXT,
      due_date      TEXT,
      payment_date  TEXT,
      status        TEXT DEFAULT 'pending',
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Proposals / Orçamentos ─────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      company_id    INTEGER,
      contact_name  TEXT,
      value         REAL DEFAULT 0,
      status        TEXT DEFAULT 'draft',
      valid_until   TEXT,
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposal_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id   INTEGER NOT NULL,
      description   TEXT NOT NULL,
      quantity      REAL DEFAULT 1,
      unit_price    REAL DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Projects / Obras ───────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      company_id    INTEGER,
      description   TEXT,
      status        TEXT DEFAULT 'planning',
      start_date    TEXT,
      end_date      TEXT,
      value         REAL DEFAULT 0,
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_phases (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id    INTEGER NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT,
      status        TEXT DEFAULT 'pending',
      start_date    TEXT,
      end_date      TEXT,
      progress      INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Tickets / Chamados ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      description   TEXT,
      company_id    INTEGER,
      contact_name  TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      category      TEXT DEFAULT 'support',
      priority      TEXT DEFAULT 'medium',
      level         INTEGER DEFAULT 1,
      status        TEXT DEFAULT 'open',
      assigned_to   TEXT,
      sla_deadline  TEXT,
      resolved_at   TEXT,
      closed_at     TEXT,
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id     INTEGER NOT NULL,
      author        TEXT,
      message       TEXT NOT NULL,
      is_internal   INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Rental Availability / Locação ──────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS rental_availability (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id  INTEGER NOT NULL,
      start_date    TEXT NOT NULL,
      end_date      TEXT NOT NULL,
      status        TEXT DEFAULT 'reserved',
      contract_id   INTEGER,
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Campaigns / Marketing ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      type          TEXT DEFAULT 'email',
      status        TEXT DEFAULT 'draft',
      segment       TEXT,
      subject       TEXT,
      content       TEXT,
      sent_count    INTEGER DEFAULT 0,
      open_count    INTEGER DEFAULT 0,
      click_count   INTEGER DEFAULT 0,
      scheduled_at  TEXT,
      sent_at       TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_targets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id   INTEGER NOT NULL,
      lead_id       INTEGER,
      company_id    INTEGER,
      email         TEXT,
      sent          INTEGER DEFAULT 0,
      opened        INTEGER DEFAULT 0,
      clicked       INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Follow-ups / Pós-Venda ─────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS followups (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type   TEXT NOT NULL,
      entity_id     INTEGER NOT NULL,
      scheduled_date TEXT,
      completed_date TEXT,
      status        TEXT DEFAULT 'pending',
      notes         TEXT,
      nps_score     INTEGER,
      nps_comment   TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Lead Enrichments / Hunter ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_enrichments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id       INTEGER NOT NULL UNIQUE,
      cnpj          TEXT,
      website       TEXT,
      linkedin_url  TEXT,
      revenue_estimate TEXT,
      employee_count INTEGER,
      industry      TEXT,
      source        TEXT,
      raw_data      TEXT,
      enriched_at   TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  logger.info('Migrations complete.');
}
