import * as rentalService from '../services/rental-service.js';

export default async function (app) {
  app.get('/api/rental/availability', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { equipment_id, start_date, end_date } = req.query;
    return rentalService.getAllAvailability({
      equipment_id: equipment_id ? parseInt(equipment_id) : undefined,
      start_date, end_date,
    });
  });

  app.post('/api/rental/availability', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { equipment_id, start_date, end_date, status, contract_id, notes } = req.body;
    return rentalService.blockDates(equipment_id, start_date, end_date, status, contract_id, notes);
  });

  app.delete('/api/rental/availability/:id', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const deleted = await rentalService.removeBlock(parseInt(req.params.id));
    if (!deleted) return reply.code(404).send({ error: 'Bloco não encontrado' });
    return { success: true };
  });

  app.get('/api/rental/available', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const { start_date, end_date } = req.query;
    return rentalService.getAvailableEquipment(start_date, end_date);
  });

  app.get('/api/rental/utilization', { preHandler: [app.requireAuth] }, async (req, reply) => {
    return rentalService.getFleetUtilization();
  });

  app.get('/api/rental/expiring', { preHandler: [app.requireAuth] }, async (req, reply) => {
    const days = parseInt(req.query.days) || 15;
    return rentalService.getContractsEndingSoon(days);
  });
}
