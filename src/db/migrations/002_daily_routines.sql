-- Rodar no SQL Editor do Supabase
-- Criação da tabela daily_routines para o módulo Rotinas Diárias

CREATE TABLE IF NOT EXISTS daily_routines (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  priority      TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  assigned_to   TEXT,
  due_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_daily_routines_status ON daily_routines(status);
CREATE INDEX IF NOT EXISTS idx_daily_routines_assigned_to ON daily_routines(assigned_to);
CREATE INDEX IF NOT EXISTS idx_daily_routines_due_date ON daily_routines(due_date);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_routines_updated_at ON daily_routines;
CREATE TRIGGER trg_daily_routines_updated_at
  BEFORE UPDATE ON daily_routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE daily_routines ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ler
CREATE POLICY "Todos podem ler daily_routines"
  ON daily_routines FOR SELECT
  USING (true);

-- Política: todos podem inserir
CREATE POLICY "Todos podem inserir daily_routines"
  ON daily_routines FOR INSERT
  WITH CHECK (true);

-- Política: todos podem atualizar
CREATE POLICY "Todos podem atualizar daily_routines"
  ON daily_routines FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: todos podem excluir
CREATE POLICY "Todos podem excluir daily_routines"
  ON daily_routines FOR DELETE
  USING (true);
