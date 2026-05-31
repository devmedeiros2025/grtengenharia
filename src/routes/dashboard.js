import { getDb } from '../db/schema.js';

export async function dashboardRoutes(app) {
  // Charts data for dashboard
  app.get('/api/dashboard/charts', {
    preHandler: [app.requireAuth],
  }, async () => {
    const db = getDb();

    // Leads per month (last 6 months)
    const leadsByMonth = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM leads
      WHERE created_at >= date('now', '-6 months')
      GROUP BY month ORDER BY month
    `).all();

    // Deals by stage
    const dealsByStage = db.prepare(`
      SELECT COALESCE(stage, 'unknown') as stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
      FROM deals
      GROUP BY stage
    `).all();

    // Lead status distribution
    const leadsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM leads GROUP BY status
    `).all();

    // Conversion funnel
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const convertedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'").get().count;
    const wonDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE stage = 'won'").get().count;

    // Total pipeline value
    const pipelineValue = db.prepare('SELECT COALESCE(SUM(value), 0) as total FROM deals').get().total;

    return {
      leads_by_month: leadsByMonth,
      deals_by_stage: dealsByStage,
      leads_by_status: leadsByStatus,
      funnel: {
        total_leads: totalLeads,
        converted_leads: convertedLeads,
        won_deals: wonDeals,
      },
      pipeline_total: pipelineValue,
    };
  });
}
