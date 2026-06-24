-- Adicionar colunas para squads e admissão
ALTER TABLE users ADD COLUMN IF NOT EXISTS squad TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_date DATE;

-- Tabela de rotinas diárias
CREATE TABLE IF NOT EXISTS daily_routines (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'pending',
  priority      TEXT DEFAULT 'medium',
  due_date      TIMESTAMPTZ,
  column_name   TEXT DEFAULT 'todo',
  order_index   INTEGER DEFAULT 0,
  assigned_by   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_routines_user ON daily_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_routines_status ON daily_routines(status);
CREATE INDEX IF NOT EXISTS idx_daily_routines_column ON daily_routines(column_name);

-- Adicionar colunas para clientes/empresas (métricas de marketing)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status_health TEXT DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS budget REAL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS spent REAL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS balance REAL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cpl_avg REAL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS campaign_count INTEGER DEFAULT 0;
