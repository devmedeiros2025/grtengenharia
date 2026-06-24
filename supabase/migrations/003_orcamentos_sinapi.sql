-- Migration 003: Módulo de Orçamento de Obras (SINAPI)
-- Cria tabelas para orçamento de obras com base SINAPI, composições e BDI

-- ── Insumos SINAPI ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sinapi_insumos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo        TEXT NOT NULL,
  descricao     TEXT NOT NULL,
  unidade       TEXT NOT NULL,
  tipo          TEXT DEFAULT 'material' CHECK (tipo IN ('material', 'mao_de_obra', 'equipamento')),
  preco_sem_desoneracao  NUMERIC(12,2) DEFAULT 0,
  preco_com_desoneracao  NUMERIC(12,2) DEFAULT 0,
  fonte         TEXT DEFAULT 'SINAPI',
  data_base     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sinapi_insumos_codigo ON sinapi_insumos(codigo);
CREATE INDEX IF NOT EXISTS idx_sinapi_insumos_tipo ON sinapi_insumos(tipo);

-- ── Composições SINAPI ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sinapi_composicoes (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo        TEXT NOT NULL,
  descricao     TEXT NOT NULL,
  unidade       TEXT NOT NULL,
  tipo          TEXT DEFAULT 'composicao' CHECK (tipo IN ('composicao', 'subcomposicao')),
  preco_sem_desoneracao  NUMERIC(12,2) DEFAULT 0,
  preco_com_desoneracao  NUMERIC(12,2) DEFAULT 0,
  data_base     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sinapi_composicoes_codigo ON sinapi_composicoes(codigo);

-- ── Itens das Composições ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sinapi_composicao_itens (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  composicao_id   BIGINT NOT NULL REFERENCES sinapi_composicoes(id) ON DELETE CASCADE,
  item_codigo     TEXT NOT NULL,
  item_tipo       TEXT NOT NULL CHECK (item_tipo IN ('insumo', 'composicao')),
  descricao       TEXT,
  unidade         TEXT,
  coeficiente     NUMERIC(10,4) DEFAULT 1,
  preco_unitario  NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sinapi_composicao_itens_composicao_id ON sinapi_composicao_itens(composicao_id);

-- ── Orçamentos ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orcamentos (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo            TEXT NOT NULL,
  cliente           TEXT,
  obra              TEXT,
  local             TEXT,
  company_id        BIGINT,
  status            TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'em_andamento', 'finalizado', 'aprovado', 'cancelado')),
  data_base         TEXT,
  bdi_percentual    NUMERIC(6,2) DEFAULT 0,
  bdi_administracao NUMERIC(6,2) DEFAULT 0,
  bdi_riscos        NUMERIC(6,2) DEFAULT 0,
  bdi_lucro         NUMERIC(6,2) DEFAULT 0,
  bdi_impostos      NUMERIC(6,2) DEFAULT 0,
  valor_total       NUMERIC(14,2) DEFAULT 0,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_company_id ON orcamentos(company_id);

-- ── Itens do Orçamento ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orcamento_id    BIGINT NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  composicao_id   BIGINT REFERENCES sinapi_composicoes(id),
  codigo          TEXT,
  descricao       TEXT NOT NULL,
  unidade         TEXT,
  quantidade      NUMERIC(12,4) DEFAULT 1,
  preco_unitario  NUMERIC(12,2) DEFAULT 0,
  preco_total     NUMERIC(14,2) DEFAULT 0,
  tipo            TEXT DEFAULT 'servico' CHECK (tipo IN ('servico', 'insumo', 'item_avulso')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id ON orcamento_itens(orcamento_id);

-- ── Trigger: auto-update updated_at ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sinapi_insumos_updated_at') THEN
    CREATE TRIGGER set_sinapi_insumos_updated_at BEFORE UPDATE ON sinapi_insumos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sinapi_composicoes_updated_at') THEN
    CREATE TRIGGER set_sinapi_composicoes_updated_at BEFORE UPDATE ON sinapi_composicoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_orcamentos_updated_at') THEN
    CREATE TRIGGER set_orcamentos_updated_at BEFORE UPDATE ON orcamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

ALTER TABLE sinapi_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinapi_composicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinapi_composicao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ler/inserir insumos e composições (são dados de referência)
CREATE POLICY "Insumos são públicos para usuários autenticados" ON sinapi_insumos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Composições são públicas para usuários autenticados" ON sinapi_composicoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Itens de composição públicos" ON sinapi_composicao_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orçamentos são privados por company_id (quando implementado multi-empresa)
CREATE POLICY "Orçamentos visíveis para o usuário" ON orcamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Itens de orçamento visíveis" ON orcamento_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
