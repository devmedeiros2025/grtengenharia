import db from '../db/adapter.js';

export async function calendarRoutes(app) {
  app.get('/api/calendar', { preHandler: [app.requireAuth], schema: { tags: ['Calendar'], summary: 'Eventos do calendário', description: 'Retorna ordens de serviço, contratos e tarefas do mês' } }, async (request) => {
    const now = new Date();
    const month = parseInt(request.query.month) || (now.getMonth() + 1);
    const year = parseInt(request.query.year) || now.getFullYear();

    // Month bounds
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    // Service orders opened/closed in this month
    const orders = await db.select('service_orders', {
      columns: "id, title, 'service_order' as type, status, opened_at as start_date, closed_at as end_date",
      conditions: [
        { field: 'opened_at', op: 'gte', value: start },
        { field: 'opened_at', op: 'lte', value: end + 'T23:59:59' },
      ],
    });

    // Contracts active or ending in this month
    const contracts = await db.select('contracts', {
      columns: "id, title, 'contract' as type, status, start_date, end_date",
      conditions: [
        { field: 'start_date', op: 'gte', value: start },
        { field: 'start_date', op: 'lte', value: end },
      ],
    });

    const contractsEnding = await db.select('contracts', {
      columns: "id, title, 'contract' as type, status, start_date, end_date",
      conditions: [
        { field: 'end_date', op: 'gte', value: start },
        { field: 'end_date', op: 'lte', value: end },
      ],
    });

    const activeContracts = await db.select('contracts', {
      columns: "id, title, 'contract' as type, status, start_date, end_date",
      conditions: [
        { field: 'status', op: 'eq', value: 'active' },
        { field: 'start_date', op: 'lte', value: end },
        { field: 'end_date', op: 'gte', value: start },
      ],
    });

    // Tasks with due dates in this month
    const tasks = await db.select('tasks', {
      columns: "id, title, 'task' as type, status, due_date as start_date, NULL as end_date",
      conditions: [
        { field: 'due_date', op: 'gte', value: start },
        { field: 'due_date', op: 'lte', value: end + 'T23:59:59' },
      ],
    });

    // Merge contracts (deduplicate by id)
    const allContracts = [...contracts, ...contractsEnding, ...activeContracts];
    const uniqueContracts = [...new Map(allContracts.map(c => [c.id, c])).values()];

    return {
      events: [...orders, ...uniqueContracts, ...tasks],
      month,
      year,
    };
  });
}
