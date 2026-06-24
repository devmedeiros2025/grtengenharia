import * as fileService from '../services/file-service.js';

export async function fileRoutes(app) {
  // Upload file — entity IDs via query params (lead_id, company_id, deal_id)
  app.post('/api/upload', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Files'], summary: 'Upload de arquivo', description: 'Faz upload de um arquivo e associa a uma entidade' },
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado' });

    const buffer = await data.toBuffer();

    // Read entity IDs from multipart fields or query string
    const fields = data.fields || {};
    const leadId = parseInt(fields.lead_id?.value || request.query.lead_id) || null;
    const companyId = parseInt(fields.company_id?.value || request.query.company_id) || null;
    const dealId = parseInt(fields.deal_id?.value || request.query.deal_id) || null;
    const contractId = parseInt(fields.contract_id?.value || request.query.contract_id) || null;

      const file = await fileService.saveFile(buffer, data.filename, data.mimetype, {
      leadId, companyId, dealId, contractId,
    });

    return reply.code(201).send(file);
  });

  // List files for an entity
  app.get('/api/files', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Files'], summary: 'Listar arquivos', description: 'Retorna arquivos associados a uma entidade' },
  }, async (request) => {
    return fileService.listFiles({
      leadId: request.query.lead_id,
      companyId: request.query.company_id,
      dealId: request.query.deal_id,
      contractId: request.query.contract_id,
    });
  });

  // Download file
  app.get('/api/files/:id/download', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Files'], summary: 'Download de arquivo', description: 'Faz download de um arquivo pelo ID' },
  }, async (request, reply) => {
    const file = await fileService.getFile(Number(request.params.id));
    if (!file) return reply.code(404).send({ error: 'Arquivo não encontrado' });

    const buffer = fileService.getFileBuffer(file.filename);
    if (!buffer) return reply.code(404).send({ error: 'Arquivo não encontrado no disco' });

    reply.header('Content-Type', file.mime_type);
    reply.header('Content-Disposition', `attachment; filename="${file.original_name}"`);
    return reply.send(buffer);
  });

  // Delete file
  app.delete('/api/files/:id', {
    preHandler: [app.requireAuth],
    schema: { tags: ['Files'], summary: 'Excluir arquivo', description: 'Remove um arquivo do sistema' },
  }, async (request, reply) => {
    const ok = await fileService.deleteFile(Number(request.params.id));
    if (!ok) return reply.code(404).send({ error: 'Arquivo não encontrado' });
    return { ok: true };
  });
}
