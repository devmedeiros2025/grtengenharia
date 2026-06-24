import * as orcamentoService from '../services/orcamento-service.js';
import {
  createOrcamentoSchema,
  updateOrcamentoSchema,
  addItemOrcamentoSchema,
  createInsumoSchema,
  updateInsumoSchema,
  createComposicaoSchema,
  updateComposicaoSchema,
  addItemComposicaoSchema,
} from '../validators/orcamento-validator.js';
import { handleValidationError } from '../lib/validation-helper.js';

export async function orcamentoRoutes(app) {
  // ── Orçamentos ──────────────────────────────────────────────────────────────

  app.get('/api/orcamentos', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Listar orçamentos', description: 'Retorna lista paginada de orçamentos' } }, async (request) => {
    return orcamentoService.listOrcamentos(request.query);
  });

  app.post('/api/orcamentos', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Criar orçamento', description: 'Adiciona um novo orçamento' } }, async (request, reply) => {
    try {
      const data = createOrcamentoSchema.parse(request.body);
      const item = await orcamentoService.createOrcamento(data);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.get('/api/orcamentos/:id', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Obter orçamento por ID', description: 'Retorna detalhes de um orçamento específico' } }, async (request, reply) => {
    const item = await orcamentoService.getOrcamento(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Orçamento não encontrado' });
    return item;
  });

  app.patch('/api/orcamentos/:id', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Atualizar orçamento', description: 'Atualiza dados de um orçamento existente' } }, async (request, reply) => {
    try {
      const data = updateOrcamentoSchema.parse(request.body);
      const item = await orcamentoService.updateOrcamento(Number(request.params.id), data);
      if (!item) return reply.code(404).send({ error: 'Orçamento não encontrado' });
      return item;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/orcamentos/:id', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Excluir orçamento', description: 'Remove um orçamento do sistema' } }, async (request, reply) => {
    const ok = await orcamentoService.deleteOrcamento(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Orçamento não encontrado' });
    return { ok: true };
  });

  app.post('/api/orcamentos/:id/duplicar', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Duplicar orçamento', description: 'Duplica um orçamento existente' } }, async (request, reply) => {
    const item = await orcamentoService.duplicarOrcamento(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Orçamento não encontrado' });
    return reply.code(201).send(item);
  });

  app.post('/api/orcamentos/:id/aprovar', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Aprovar orçamento', description: 'Aprova um orçamento pendente' } }, async (request, reply) => {
    const item = await orcamentoService.aprovarOrcamento(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Orçamento não encontrado' });
    return item;
  });

  // ── Itens do orçamento ──────────────────────────────────────────────────────

  app.post('/api/orcamentos/:id/itens', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Adicionar item', description: 'Adiciona um item a um orçamento' } }, async (request, reply) => {
    try {
      const data = addItemOrcamentoSchema.parse({ ...request.body, orcamento_id: Number(request.params.id) });
      const item = await orcamentoService.addItem(data);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.patch('/api/orcamentos/:id/itens/:itemId', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Atualizar item', description: 'Atualiza um item de orçamento' } }, async (request, reply) => {
    try {
      const data = updateOrcamentoSchema.partial().parse(request.body);
      const item = await orcamentoService.updateItem(Number(request.params.itemId), data);
      if (!item) return reply.code(404).send({ error: 'Item não encontrado' });
      return item;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/orcamentos/:id/itens/:itemId', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Excluir item', description: 'Remove um item de orçamento' } }, async (request, reply) => {
    const ok = await orcamentoService.removeItem(Number(request.params.itemId));
    if (!ok) return reply.code(404).send({ error: 'Item não encontrado' });
    return { ok: true };
  });

  app.post('/api/orcamentos/:id/recalcular', { preHandler: [app.requireAuth], schema: { tags: ['Orçamentos'], summary: 'Recalcular orçamento', description: 'Recalcula os valores totais do orçamento' } }, async (request, reply) => {
    const item = await orcamentoService.recalcularOrcamento(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Orçamento não encontrado' });
    return item;
  });

  // ── Insumos SINAPI ──────────────────────────────────────────────────────────

  app.get('/api/sinapi/insumos', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Listar insumos', description: 'Retorna lista paginada de insumos SINAPI' } }, async (request) => {
    return orcamentoService.listInsumos(request.query);
  });

  app.post('/api/sinapi/insumos', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Criar insumo', description: 'Adiciona um novo insumo SINAPI' } }, async (request, reply) => {
    try {
      const data = createInsumoSchema.parse(request.body);
      const item = await orcamentoService.createInsumo(data);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.patch('/api/sinapi/insumos/:id', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Atualizar insumo', description: 'Atualiza dados de um insumo SINAPI' } }, async (request, reply) => {
    try {
      const data = updateInsumoSchema.parse(request.body);
      const item = await orcamentoService.updateInsumo(Number(request.params.id), data);
      if (!item) return reply.code(404).send({ error: 'Insumo não encontrado' });
      return item;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/sinapi/insumos/:id', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Excluir insumo', description: 'Remove um insumo SINAPI' } }, async (request, reply) => {
    const ok = await orcamentoService.deleteInsumo(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Insumo não encontrado' });
    return { ok: true };
  });

  app.post('/api/sinapi/insumos/importar', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Importar insumos', description: 'Importa múltiplos insumos SINAPI em lote' } }, async (request, reply) => {
    const { insumos } = request.body;
    if (!Array.isArray(insumos) || insumos.length === 0) {
      return reply.code(400).send({ error: 'Envie um array de insumos' });
    }
    const results = await orcamentoService.importarInsumos(insumos);
    return reply.code(201).send({ imported: results.length, insumos: results });
  });

  // ── Composições SINAPI ──────────────────────────────────────────────────────

  app.get('/api/sinapi/composicoes', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Listar composições', description: 'Retorna lista paginada de composições SINAPI' } }, async (request) => {
    return orcamentoService.listComposicoes(request.query);
  });

  app.post('/api/sinapi/composicoes', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Criar composição', description: 'Adiciona uma nova composição SINAPI' } }, async (request, reply) => {
    try {
      const data = createComposicaoSchema.parse(request.body);
      const item = await orcamentoService.createComposicao(data);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.get('/api/sinapi/composicoes/:id', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Obter composição por ID', description: 'Retorna detalhes de uma composição SINAPI' } }, async (request, reply) => {
    const item = await orcamentoService.getComposicao(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Composição não encontrada' });
    return item;
  });

  app.patch('/api/sinapi/composicoes/:id', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Atualizar composição', description: 'Atualiza dados de uma composição SINAPI' } }, async (request, reply) => {
    try {
      const data = updateComposicaoSchema.parse(request.body);
      const item = await orcamentoService.updateComposicao(Number(request.params.id), data);
      if (!item) return reply.code(404).send({ error: 'Composição não encontrada' });
      return item;
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/sinapi/composicoes/:id', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Excluir composição', description: 'Remove uma composição SINAPI' } }, async (request, reply) => {
    const ok = await orcamentoService.deleteComposicao(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Composição não encontrada' });
    return { ok: true };
  });

  app.post('/api/sinapi/composicoes/:id/itens', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Adicionar item à composição', description: 'Adiciona um item a uma composição SINAPI' } }, async (request, reply) => {
    try {
      const data = addItemComposicaoSchema.parse(request.body);
      const item = await orcamentoService.addItemComposicao(Number(request.params.id), data);
      return reply.code(201).send(item);
    } catch (err) {
      return handleValidationError(err, reply);
    }
  });

  app.delete('/api/sinapi/composicoes/:id/itens/:itemId', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Excluir item da composição', description: 'Remove um item de uma composição SINAPI' } }, async (request, reply) => {
    const ok = await orcamentoService.removeItemComposicao(Number(request.params.itemId));
    if (!ok) return reply.code(404).send({ error: 'Item da composição não encontrado' });
    return { ok: true };
  });

  app.post('/api/sinapi/composicoes/:id/recalcular', { preHandler: [app.requireAuth], schema: { tags: ['SINAPI'], summary: 'Recalcular composição', description: 'Recalcula o preço de uma composição SINAPI' } }, async (request, reply) => {
    const item = await orcamentoService.calcularPrecoComposicao(Number(request.params.id));
    if (!item) return reply.code(404).send({ error: 'Composição não encontrada' });
    return item;
  });
}
