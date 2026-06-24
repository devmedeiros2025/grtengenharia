import * as rentalService from '../services/rental-service.js';

export default async function (app) {
  app.get('/api/rental/availability', { preHandler: [app.requireAuth], schema: { tags: ['Rental'], summary: 'Listar disponibilidade', description: 'Retorna disponibilidade de equipamentos para locação' } }, async (req, reply) => {
    const { equipment_id, start_date, end_date } = req.query;
    return rentalService.getAllAvailability({
      equipment_id: equipment_id ? parseInt(equipment_id) : undefined,
      start_date, end_date,
    });
  });

  app.post('/api/rental/availability', { preHandler: [app.requireAuth], schema: { tags: ['Rental'], summary: 'Bloquear datas', description: 'Bloqueia datas para locação de equipamento' } }, async (req, reply) => {
    const { equipment_id, start_date, end_date, status, contract_id, notes } = req.body;
    return rentalService.blockDates(equipment_id, start_date, end_date, status, contract_id, notes);
  });

  app.patch('/api/rental/availability/:id', { preHandler: [app.requireAuth], schema: { tags: ['Rental'], summary: 'Atualizar bloco', description: 'Atualiza um bloco de disponibilidade' } }, async (req, reply) => {
    const updated = await rentalService.updateBlock(parseInt(req.params.id), req.body);
    if (!updated) return reply.code(404).send({ error: 'Bloco nÃ£o encontrado' });
    return updated;
  });

  app.delete('/api/rental/availability/:id', { preHandler: [app.requireAuth], schema: { tags: ['Rental'], summary: 'Remover bloco', description: 'Remove um bloco de disponibilidade' } }, async (req, reply) => {
    const deleted = await rentalService.removeBlock(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Bloco nÃ£o encontrado' });
    return { success: true };
  });

  app.get('/api/rental/available', { preHandler: [app.requireAuth], schema: { tags: ['Rental'], summary: 'Equipamentos disponíveis', description: 'Retorna equipamentos disponíveis em um período' } }, async (req, reply) => {
    const { start_date, end_date } = req.query;
    return rentalService.getAvailableEquipment(start_date, end_date);
  });

  app.get('/api/rental/utilization', { preHandler: [app.requireAuth], schema: { tags: ['Rental'], summary: 'Utilização da frota', description: 'Retorna taxa de utilização da frota' } }, async (req, reply) => {
    return rentalService.getFleetUtilization();
  });

  app.get('/api/rental/expiring', { preHandler: [app.requireAuth], schema: { tags: ['Rental'], summary: 'Contratos a vencer', description: 'Retorna contratos de locação próximos do vencimento' } }, async (req, reply) => {
    const days = parseInt(req.query.days) || 15;
    return rentalService.getContractsEndingSoon(days);
  });
}
