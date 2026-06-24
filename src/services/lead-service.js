import db from '../db/adapter.js';
import { ValidationError } from '../lib/errors.js';
export async function createLead(data) {
  const { name, email, phone, company, source = 'api', campaign = null, message = null, metadata = '{}' } = data;

  if (!name || name.trim().length === 0) {
    throw new ValidationError('Nome é obrigatório');
  }

  const result = await db.create('leads', {
    name: name.trim(), email: email || null, phone: phone || null,
    company: company || null, source, campaign: campaign || null,
    message: message || null,
    metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
  });

  const lead = await getLeadById(result?.id);
  return lead;
}

export async function getLeadById(id) {
  const row = await db.get('leads', id);
  if (!row) return null;
  return formatLead(row);
}

export async function listLeads({ status, source, search, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const params = [];

  if (status) conditions.push({ field: 'status', op: 'eq', value: status });
  if (source) conditions.push({ field: 'source', op: 'eq', value: source });

  const offset = (page - 1) * limit;

  // For search with OR, use filtered results
  if (search) {
    const where = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (source) { where.push('source = ?'); params.push(source); }
    if (search) {
      const q = `%${search}%`;
      where.push('(name LIKE ? OR email LIKE ? OR company LIKE ? OR phone LIKE ?)');
      params.push(q, q, q, q);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await db.row(`SELECT COUNT(*) as total FROM leads ${whereClause}`, params);
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT * FROM leads ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      leads: rows.map(formatLead),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // No search - use structured pagination
  const result = await db.paginate('leads', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  return {
    leads: result.data.map(formatLead),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}

export async function updateLead(id, data) {
  const lead = await getLeadById(id);
  if (!lead) return null;

  const updateData = {};
  const allowed = ['name', 'email', 'phone', 'company', 'status', 'score', 'message', 'metadata'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updateData[field] = field === 'metadata' && typeof data[field] === 'object'
        ? JSON.stringify(data[field])
        : data[field];
    }
  }

  if (Object.keys(updateData).length === 0) return lead;

  await db.update('leads', id, updateData);
  const updated = await getLeadById(id);

  return updated;
}

export async function deleteLead(id) {
  const lead = await getLeadById(id);
  if (!lead) return false;
  return db.delete('leads', id);
}

export async function getLeadsStats() {
  const rows = await db.select('leads', { columns: 'status, created_at' });
  const total = rows.length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = rows.filter(l => (l.created_at || '').slice(0, 10) === todayStr).length;

  const byStatus = {};
  for (const r of rows) {
    const s = r.status || 'unknown';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  return { total, today, byStatus };
}

// ── Kanban status constants ────────────────────────────────────────────────
export const KANBAN_STATUSES = [
  'novo_lead',
  'em_tentativa',
  'em_qualificacao',
  'reuniao_agendada',
  'proposta_enviada',
  'contrato_fechamento',
  'ganho',
  'perdido',
  'arquivado',
];

// Status terminais (não podem sair)
const TERMINAL = ['ganho', 'perdido', 'arquivado'];

// Mapa de transições permitidas
const TRANSITIONS = {
  novo_lead: ['em_tentativa', 'em_qualificacao', 'arquivado'],
  em_tentativa: ['em_qualificacao', 'novo_lead', 'arquivado'],
  em_qualificacao: ['reuniao_agendada', 'perdido', 'arquivado'],
  reuniao_agendada: ['proposta_enviada', 'em_qualificacao', 'perdido'],
  proposta_enviada: ['contrato_fechamento', 'em_tentativa', 'perdido'],
  contrato_fechamento: ['ganho', 'perdido', 'arquivado'],
  ganho: [],
  perdido: [],
  arquivado: [],
};

/**
 * Valida e executa transição de status kanban
 */
export async function transitionLead(id, toStatus) {
  const lead = await getLeadById(id);
  if (!lead) throw new Error('Lead não encontrado');

  // Normaliza status legado (ex: "new" → "novo_lead")
  const from = KANBAN_STATUSES.includes(lead.status) ? lead.status : 'novo_lead';

  // Status inválido
  if (!KANBAN_STATUSES.includes(toStatus)) {
    throw new Error(`Status inválido: ${toStatus}`);
  }

  // Verifica se é terminal
  if (TERMINAL.includes(from)) {
    throw new ValidationError(`Lead está em status final "${from}". Não pode ser alterado.`);
  }

  // Verifica transição permitida
  const allowed = TRANSITIONS[from] || [];
  if (!allowed.includes(toStatus)) {
    throw new ValidationError(`Transição inválida: "${from}" → "${toStatus}"`);
  }

  // Validações específicas
  if (toStatus === 'reuniao_agendada' && !lead.appointment_date) {
    throw new ValidationError('Para mover para "Reunião Agendada", preencha a data de agendamento (appointment_date)');
  }
  if (toStatus === 'proposta_enviada' && (!lead.proposal_value || Number(lead.proposal_value) <= 0)) {
    throw new ValidationError('Para mover para "Proposta Enviada", preencha o valor da proposta (proposal_value)');
  }
  if (toStatus === 'perdido' && !lead.lost_reason) {
    throw new ValidationError('Para mover para "Perdido", informe o motivo da perda (lost_reason)');
  }

  const updateData = { status: toStatus, stage_entered_at: new Date().toISOString() };

  // Se move para ganho, registra closed_at
  if (toStatus === 'ganho') {
    updateData.closed_at = new Date().toISOString();
  }

  await db.update('leads', id, updateData);
  return getLeadById(id);
}

/**
 * Retorna leads agrupados por status kanban
 */
export async function getLeadsKanban() {
  const rows = await db.select('leads', { orderBy: ['stage_entered_at', 'desc'] });
  const grouped = {};
  for (const s of KANBAN_STATUSES) grouped[s] = [];
  for (const r of rows) {
    const st = r.status && KANBAN_STATUSES.includes(r.status) ? r.status : 'novo_lead';
    // Calcula dias na etapa
    const slaDays = r.stage_entered_at
      ? Math.floor((Date.now() - new Date(r.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    grouped[st].push({ ...formatLead(r), sla_days: slaDays });
  }
  return KANBAN_STATUSES.map(s => ({
    status: s,
    leads: grouped[s],
    count: grouped[s].length,
  }));
}

// ── SLA: retorna leads em alerta (em_tentativa ou proposta_enviada parados >5 dias úteis)
export async function getSlaAlerts() {
  const rows = await db.select('leads', {
    conditions: [
      { field: 'status', op: 'in', value: ['em_tentativa', 'proposta_enviada'] },
    ],
  });
  const now = Date.now();
  const msPerBusinessDay = 5 * 24 * 60 * 60 * 1000; // ~5 dias
  return rows
    .filter(r => r.stage_entered_at && (now - new Date(r.stage_entered_at).getTime()) > msPerBusinessDay)
    .map(r => ({ id: r.id, name: r.name, status: r.status, sla_days: Math.floor((now - new Date(r.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)) }));
}

function formatLead(row) {
  return {
    ...row,
    metadata: tryParseJson(row.metadata),
  };
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
