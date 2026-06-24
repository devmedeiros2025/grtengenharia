-- Tabela de colaboradores/usuarios (caso nao exista no Supabase)
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT DEFAULT 'user',
  cargo         TEXT,
  funcao        TEXT,
  active        INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de logs de atividade
CREATE TABLE IF NOT EXISTS activity_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       TEXT,
  user_name     TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     BIGINT,
  entity_name   TEXT,
  details       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
