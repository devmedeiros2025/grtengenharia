-- ═══════════════════════════════════════════════════════════════════════════════
-- GRT CRM — PostgreSQL Migration (Supabase)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── LEADS ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  company     TEXT,
  source      TEXT DEFAULT 'api',
  campaign    TEXT,
  message     TEXT,
  status      TEXT DEFAULT 'new',
  score       INTEGER DEFAULT 0,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── WEBHOOKS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_inbound (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  source      TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_outbound (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  token       TEXT,
  event       TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  direction       TEXT NOT NULL,
  webhook_id      BIGINT,
  source          TEXT,
  payload         JSONB,
  response_status INTEGER,
  response_body   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── API KEYS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  key         TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── COMPANIES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── DEALS / PIPELINE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL,
  value         REAL DEFAULT 0,
  currency      TEXT DEFAULT 'BRL',
  stage         TEXT DEFAULT 'prospecting',
  probability   INTEGER DEFAULT 10,
  company_id    BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source        TEXT,
  notes         TEXT,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── TASKS ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'pending',
  priority    TEXT DEFAULT 'medium',
  due_date    TIMESTAMPTZ,
  deal_id     BIGINT REFERENCES deals(id) ON DELETE SET NULL,
  company_id  BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── PIPELINE STAGES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  stage_key   TEXT NOT NULL UNIQUE,
  probability INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  color       TEXT DEFAULT '#6b7280'
);

-- Seed default pipeline stages
INSERT INTO pipeline_stages (name, stage_key, probability, order_index, color) VALUES
  ('Prospecção', 'prospecting', 10, 0, '#f5a623'),
  ('Qualificação', 'qualification', 25, 1, '#3b82f6'),
  ('Proposta', 'proposal', 50, 2, '#8b5cf6'),
  ('Negociação', 'negotiation', 75, 3, '#ec4899'),
  ('Fechado Ganho', 'won', 100, 4, '#10b981'),
  ('Fechado Perdido', 'lost', 0, 5, '#ef4444')
ON CONFLICT (stage_key) DO NOTHING;

-- ── ATTACHMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id       BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  company_id    BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  deal_id       BIGINT REFERENCES deals(id) ON DELETE CASCADE,
  contract_id   BIGINT,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT DEFAULT 'application/octet-stream',
  size          BIGINT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── EQUIPMENT ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── SERVICE ORDERS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_orders (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  equipment_id  BIGINT REFERENCES equipment(id) ON DELETE SET NULL,
  client_id     BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  status        TEXT DEFAULT 'open',
  priority      TEXT DEFAULT 'medium',
  opened_at     TIMESTAMPTZ DEFAULT now(),
  closed_at     TIMESTAMPTZ,
  value         REAL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── CONTRACTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL,
  company_id    BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  equipment_id  BIGINT REFERENCES equipment(id) ON DELETE SET NULL,
  type          TEXT DEFAULT 'rental',
  value         REAL DEFAULT 0,
  start_date    TIMESTAMPTZ,
  end_date      TIMESTAMPTZ,
  status        TEXT DEFAULT 'active',
  notes         TEXT,
  file          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── NOTIFICATIONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'info',
  message     TEXT NOT NULL,
  link        TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOVOS MÓDULOS (Fases 1-9)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── INVOICES / FATURAMENTO ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id     BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
  company_id      BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  value           REAL DEFAULT 0,
  issue_date      DATE,
  due_date        DATE,
  payment_date    DATE,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── PROPOSALS / ORÇAMENTOS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL,
  company_id    BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  contact_name  TEXT,
  value         REAL DEFAULT 0,
  status        TEXT DEFAULT 'draft',
  valid_until   DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_items (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id   BIGINT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  quantity      REAL DEFAULT 1,
  unit_price    REAL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── PROJECTS / OBRAS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  company_id    BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  description   TEXT,
  status        TEXT DEFAULT 'planning',
  start_date    DATE,
  end_date      DATE,
  value         REAL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_phases (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'pending',
  start_date    DATE,
  end_date      DATE,
  progress      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── TICKETS / CHAMADOS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  company_id    BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  category      TEXT DEFAULT 'support',
  priority      TEXT DEFAULT 'medium',
  level         INTEGER DEFAULT 1,
  status        TEXT DEFAULT 'open',
  assigned_to   TEXT,
  sla_deadline  TIMESTAMPTZ,
  resolved_at   TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id     BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author        TEXT,
  message       TEXT NOT NULL,
  is_internal   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── RENTAL AVAILABILITY / LOCAÇÃO ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rental_availability (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  equipment_id  BIGINT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT DEFAULT 'reserved',
  contract_id   BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── CAMPAIGNS / MARKETING ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT DEFAULT 'email',
  status        TEXT DEFAULT 'draft',
  segment       TEXT,
  subject       TEXT,
  content       TEXT,
  sent_count    INTEGER DEFAULT 0,
  open_count    INTEGER DEFAULT 0,
  click_count   INTEGER DEFAULT 0,
  scheduled_at  TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_targets (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id   BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id       BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  company_id    BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  email         TEXT,
  sent          BOOLEAN DEFAULT false,
  opened        BOOLEAN DEFAULT false,
  clicked       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── FOLLOW-UPS / PÓS-VENDA ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followups (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type     TEXT NOT NULL,
  entity_id       BIGINT NOT NULL,
  scheduled_date  DATE,
  completed_date  DATE,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  nps_score       INTEGER,
  nps_comment     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── LEAD ENRICHMENTS / HUNTER ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_enrichments (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id         BIGINT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  cnpj            TEXT,
  website         TEXT,
  linkedin_url    TEXT,
  revenue_estimate TEXT,
  employee_count  INTEGER,
  industry        TEXT,
  source          TEXT,
  raw_data        JSONB,
  enriched_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── INDEXES ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_sla ON tickets(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_tickets_company ON tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_rental_dates ON rental_availability(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
