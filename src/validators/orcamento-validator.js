import { z } from 'zod';

export const createInsumoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  tipo: z.string().optional().default('material'),
  preco_sem_desoneracao: z.number().min(0).optional().default(0),
  preco_com_desoneracao: z.number().min(0).optional().default(0),
  fonte: z.string().optional().default('SINAPI'),
  data_base: z.string().optional().nullable().default(null),
});

export const updateInsumoSchema = z.object({
  codigo: z.string().min(1).optional(),
  descricao: z.string().min(1).optional(),
  unidade: z.string().min(1).optional(),
  tipo: z.string().optional(),
  preco_sem_desoneracao: z.number().min(0).optional(),
  preco_com_desoneracao: z.number().min(0).optional(),
  fonte: z.string().optional(),
  data_base: z.string().optional().nullable(),
});

export const createComposicaoSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  tipo: z.string().optional().default('composicao'),
  data_base: z.string().optional().nullable().default(null),
});

export const updateComposicaoSchema = z.object({
  codigo: z.string().min(1).optional(),
  descricao: z.string().min(1).optional(),
  unidade: z.string().min(1).optional(),
  tipo: z.string().optional(),
  data_base: z.string().optional().nullable(),
});

export const createOrcamentoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  cliente: z.string().optional().nullable().default(null),
  obra: z.string().optional().nullable().default(null),
  local: z.string().optional().nullable().default(null),
  company_id: z.number().int().positive().optional().nullable().default(null),
  data_base: z.string().optional().nullable().default(null),
  bdi_percentual: z.number().min(0).optional().default(0),
  bdi_administracao: z.number().min(0).optional().default(0),
  bdi_riscos: z.number().min(0).optional().default(0),
  bdi_lucro: z.number().min(0).optional().default(0),
  bdi_impostos: z.number().min(0).optional().default(0),
  status: z.string().optional().default('draft'),
  observacoes: z.string().optional().nullable().default(null),
});

export const updateOrcamentoSchema = z.object({
  titulo: z.string().min(1).optional(),
  cliente: z.string().optional().nullable(),
  obra: z.string().optional().nullable(),
  local: z.string().optional().nullable(),
  company_id: z.number().int().positive().optional().nullable(),
  data_base: z.string().optional().nullable(),
  bdi_percentual: z.number().min(0).optional(),
  bdi_administracao: z.number().min(0).optional(),
  bdi_riscos: z.number().min(0).optional(),
  bdi_lucro: z.number().min(0).optional(),
  bdi_impostos: z.number().min(0).optional(),
  status: z.string().optional(),
  observacoes: z.string().optional().nullable(),
});

export const addItemOrcamentoSchema = z.object({
  orcamento_id: z.number().int().positive('Orçamento inválido'),
  composicao_id: z.number().int().positive().optional().nullable().default(null),
  codigo: z.string().optional().nullable().default(null),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().optional().nullable().default(null),
  quantidade: z.number().min(0).optional().default(1),
  preco_unitario: z.number().min(0).optional().default(0),
  tipo: z.string().optional().default('servico'),
});

export const updateItemOrcamentoSchema = z.object({
  composicao_id: z.number().int().positive().optional().nullable(),
  codigo: z.string().optional().nullable(),
  descricao: z.string().min(1).optional(),
  unidade: z.string().optional().nullable(),
  quantidade: z.number().min(0).optional(),
  preco_unitario: z.number().min(0).optional(),
  tipo: z.string().optional(),
});

export const addItemComposicaoSchema = z.object({
  item_codigo: z.string().min(1, 'Código do item é obrigatório'),
  item_tipo: z.string().optional().default('insumo'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  unidade: z.string().optional().nullable().default(null),
  coeficiente: z.number().min(0).optional().default(1),
  preco_unitario: z.number().min(0).optional().default(0),
});
