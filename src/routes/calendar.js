import { getDb } from '../db/schema.js';

export async function calendarRoutes(app) {
  app.get('/api/calendar', { preHandler: [app.requireAuth] }, async (request) => {
    const now = new Date();
    const month = parseInt(request.query.month) || (now.getMonth() + 1);
    const year = parseInt(request.query.year) || now.getFullYear();

    // Month bounds
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const db = getDb();

    // Service orders opened/closed in this month
    const orders = db.prepare(`
      SELECT id, title as title, 'service_order' as type, status,
             opened_at as start_date, closed_at as end_date
      FROM service_orders
      WHERE (opened_at BETWEEN ? AND ?) OR (closed_at BETWEEN ? AND ?)
      ORDER BY opened_at
    `).all(start, end, start, end);

    // Contracts active or ending in this month
    const contracts = db.prepare(`
      SELECT id, title as title, 'contract' as type, status,
             start_date, end_date
      FROM contracts
      WHERE (start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (status = 'active' AND start_date <= ? AND end_date >= ?)
      ORDER BY start_date
    `).all(start, end, start, end, start, end);

    // Tasks with due dates in this month
    const tasks = db.prepare(`
      SELECT id, title as title, 'task' as type, status,
             due_date as start_date, NULL as end_date
      FROM tasks
      WHERE due_date BETWEEN ? AND ?
      ORDER BY due_date
    `).all(start, end);

    return {
      events: [...orders, ...contracts, ...tasks],
      month,
      year,
    };
  });
}
