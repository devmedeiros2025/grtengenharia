import db from '../db/adapter.js';

// ── Insumos SINAPI ────────────────────────────────────────────────────────────

export async function createInsumo(data) {
  return db.create('sinapi_insumos', {
    codigo: data.codigo,
    descricao: data.descricao,
    unidade: data.unidade,
    tipo: data.tipo || 'material',
    preco_sem_desoneracao: data.preco_sem_desoneracao || 0,
    preco_com_desoneracao: data.preco_com_desoneracao || 0,
    fonte: data.fonte || 'SINAPI',
    data_base: data.data_base || null,
  });
}

export async function getInsumo(id) {
  return db.get('sinapi_insumos', id);
}

export async function listInsumos({ search, tipo, page = 1, limit = 50 } = {}) {
  const conditions = [];

  if (search) {
    const where = [];
    const params = [];
    const q = `%${search}%`;
    where.push('(codigo LIKE ? OR descricao LIKE ?)');
    params.push(q, q);
    if (tipo) { where.push('tipo = ?'); params.push(tipo); }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const countRow = await db.row(`SELECT COUNT(*) as total FROM sinapi_insumos ${whereClause}`, params);
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT * FROM sinapi_insumos ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { insumos: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (tipo) conditions.push({ field: 'tipo', op: 'eq', value: tipo });

  const result = await db.paginate('sinapi_insumos', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  return { insumos: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages };
}

export async function updateInsumo(id, data) {
  const existing = await db.get('sinapi_insumos', id);
  if (!existing) return null;
  return db.update('sinapi_insumos', id, data);
}

export async function deleteInsumo(id) {
  const existing = await db.get('sinapi_insumos', id);
  if (!existing) return false;
  return db.delete('sinapi_insumos', id);
}

export async function importarInsumos(insumos) {
  const results = [];
  for (const item of insumos) {
    const created = await createInsumo(item);
    results.push(created);
  }
  return results;
}

// ── Composições SINAPI ────────────────────────────────────────────────────────

export async function createComposicao(data) {
  return db.create('sinapi_composicoes', {
    codigo: data.codigo,
    descricao: data.descricao,
    unidade: data.unidade,
    tipo: data.tipo || 'composicao',
    data_base: data.data_base || null,
  });
}

export async function getComposicao(id) {
  const composicao = await db.get('sinapi_composicoes', id);
  if (!composicao) return null;

  const itens = await db.raw(
    `SELECT sci.*, si.preco_sem_desoneracao as preco_atual_sem, si.preco_com_desoneracao as preco_atual_com
     FROM sinapi_composicao_itens sci
     LEFT JOIN sinapi_insumos si ON sci.item_codigo = si.codigo AND sci.item_tipo = 'insumo'
     WHERE sci.composicao_id = ?`,
    [id]
  );

  return { ...composicao, itens };
}

export async function listComposicoes({ search, page = 1, limit = 50 } = {}) {
  if (search) {
    const q = `%${search}%`;
    const whereClause = 'WHERE (codigo LIKE ? OR descricao LIKE ?)';
    const offset = (page - 1) * limit;

    const countRow = await db.row(
      `SELECT COUNT(*) as total FROM sinapi_composicoes ${whereClause}`,
      [q, q]
    );
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT * FROM sinapi_composicoes ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [q, q, limit, offset]
    );

    return { composicoes: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const result = await db.paginate('sinapi_composicoes', {
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  return { composicoes: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages };
}

export async function updateComposicao(id, data) {
  const existing = await db.get('sinapi_composicoes', id);
  if (!existing) return null;
  return db.update('sinapi_composicoes', id, data);
}

export async function deleteComposicao(id) {
  const existing = await db.get('sinapi_composicoes', id);
  if (!existing) return false;
  await db.exec('DELETE FROM sinapi_composicao_itens WHERE composicao_id = ?', [id]);
  return db.delete('sinapi_composicoes', id);
}

export async function addItemComposicao(composicao_id, data) {
  return db.create('sinapi_composicao_itens', {
    composicao_id,
    item_codigo: data.item_codigo,
    item_tipo: data.item_tipo || 'insumo',
    descricao: data.descricao,
    unidade: data.unidade || null,
    coeficiente: data.coeficiente || 1,
    preco_unitario: data.preco_unitario || 0,
  });
}

export async function removeItemComposicao(id) {
  const existing = await db.row('SELECT * FROM sinapi_composicao_itens WHERE id = ?', [id]);
  if (!existing) return false;
  await db.exec('DELETE FROM sinapi_composicao_itens WHERE id = ?', [id]);
  return true;
}

export async function calcularPrecoComposicao(composicao_id) {
  const itens = await db.raw(
    'SELECT coeficiente, preco_unitario FROM sinapi_composicao_itens WHERE composicao_id = ?',
    [composicao_id]
  );

  const totalSem = itens.reduce((acc, i) => acc + (i.coeficiente * i.preco_unitario), 0);

  await db.update('sinapi_composicoes', composicao_id, {
    preco_sem_desoneracao: totalSem,
    preco_com_desoneracao: totalSem,
  });

  return db.get('sinapi_composicoes', composicao_id);
}

// ── Orçamentos ────────────────────────────────────────────────────────────────

export async function createOrcamento(data) {
  return db.create('orcamentos', {
    titulo: data.titulo,
    cliente: data.cliente || null,
    obra: data.obra || null,
    local: data.local || null,
    company_id: data.company_id || null,
    data_base: data.data_base || null,
    bdi_percentual: data.bdi_percentual || 0,
    bdi_administracao: data.bdi_administracao || 0,
    bdi_riscos: data.bdi_riscos || 0,
    bdi_lucro: data.bdi_lucro || 0,
    bdi_impostos: data.bdi_impostos || 0,
    status: data.status || 'draft',
    valor_total: 0,
    observacoes: data.observacoes || null,
  });
}

export async function getOrcamento(id) {
  const orcamento = await db.get('orcamentos', id);
  if (!orcamento) return null;

  const itens = await db.raw(
    'SELECT * FROM orcamento_itens WHERE orcamento_id = ? ORDER BY created_at ASC',
    [id]
  );

  return { ...orcamento, itens };
}

export async function listOrcamentos({ search, status, company_id, page = 1, limit = 50 } = {}) {
  const conditions = [];

  if (search) {
    const where = [];
    const params = [];
    const q = `%${search}%`;
    where.push('(titulo LIKE ? OR cliente LIKE ? OR obra LIKE ?)');
    params.push(q, q, q);
    if (status) { where.push('status = ?'); params.push(status); }
    if (company_id) { where.push('company_id = ?'); params.push(company_id); }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const countRow = await db.row(`SELECT COUNT(*) as total FROM orcamentos ${whereClause}`, params);
    const total = countRow?.total || 0;

    const rows = await db.raw(
      `SELECT * FROM orcamentos ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { orcamentos: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (status) conditions.push({ field: 'status', op: 'eq', value: status });
  if (company_id) conditions.push({ field: 'company_id', op: 'eq', value: company_id });

  const result = await db.paginate('orcamentos', {
    conditions: conditions.length > 0 ? conditions : null,
    page, limit,
    orderBy: ['created_at', 'desc'],
  });

  return { orcamentos: result.data, total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages };
}

export async function updateOrcamento(id, data) {
  const existing = await db.get('orcamentos', id);
  if (!existing) return null;
  return db.update('orcamentos', id, data);
}

export async function deleteOrcamento(id) {
  const existing = await db.get('orcamentos', id);
  if (!existing) return false;
  await db.exec('DELETE FROM orcamento_itens WHERE orcamento_id = ?', [id]);
  return db.delete('orcamentos', id);
}

export async function addItem(itemData) {
  return db.create('orcamento_itens', {
    orcamento_id: itemData.orcamento_id,
    composicao_id: itemData.composicao_id || null,
    codigo: itemData.codigo || null,
    descricao: itemData.descricao,
    unidade: itemData.unidade || null,
    quantidade: itemData.quantidade || 1,
    preco_unitario: itemData.preco_unitario || 0,
    preco_total: (itemData.quantidade || 1) * (itemData.preco_unitario || 0),
    tipo: itemData.tipo || 'servico',
  });
}

export async function updateItem(id, data) {
  const existing = await db.row('SELECT * FROM orcamento_itens WHERE id = ?', [id]);
  if (!existing) return null;
  const updated = await db.update('orcamento_itens', id, data);
  if (updated) {
    const qtd = updated.quantidade || existing.quantidade;
    const pu = updated.preco_unitario || existing.preco_unitario;
    await db.update('orcamento_itens', id, { preco_total: qtd * pu });
  }
  return db.row('SELECT * FROM orcamento_itens WHERE id = ?', [id]);
}

export async function removeItem(id) {
  const existing = await db.row('SELECT * FROM orcamento_itens WHERE id = ?', [id]);
  if (!existing) return false;
  await db.exec('DELETE FROM orcamento_itens WHERE id = ?', [id]);
  return true;
}

export async function recalcularOrcamento(orcamento_id) {
  const itens = await db.raw(
    'SELECT quantidade, preco_unitario FROM orcamento_itens WHERE orcamento_id = ?',
    [orcamento_id]
  );

  const subtotal = itens.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0);
  const orcamento = await db.get('orcamentos', orcamento_id);
  if (!orcamento) return null;

  const bdiPercent = orcamento.bdi_percentual || 0;
  const valorTotal = subtotal * (1 + bdiPercent / 100);

  return db.update('orcamentos', orcamento_id, { valor_total: valorTotal });
}

export async function aprovarOrcamento(id) {
  const existing = await db.get('orcamentos', id);
  if (!existing) return null;
  return db.update('orcamentos', id, { status: 'aprovado' });
}

export async function duplicarOrcamento(id) {
  const original = await db.get('orcamentos', id);
  if (!original) return null;

  const { id: _, created_at, updated_at, ...rest } = original;
  const novo = await db.create('orcamentos', {
    ...rest,
    titulo: `${rest.titulo} (cópia)`,
    status: 'draft',
    valor_total: 0,
  });

  const itens = await db.raw('SELECT * FROM orcamento_itens WHERE orcamento_id = ?', [id]);
  for (const item of itens) {
    const { id: __, created_at: ___, orcamento_id: ____, ...itemData } = item;
    await db.create('orcamento_itens', { ...itemData, orcamento_id: novo.id });
  }

  return getOrcamento(novo.id);
}
