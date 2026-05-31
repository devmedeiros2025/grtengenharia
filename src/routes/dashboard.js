import db from '../db/adapter.js';

export async function dashboardRoutes(app) {
  // Charts data for dashboard
  app.get('/api/dashboard/charts', {
    preHandler: [app.requireAuth],
  }, async () => {
    // Leads per month (last 6 months)
    const leadsByMonth = await db.raw(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM leads
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY month ORDER BY month
    `);

    // Deals by stage
    const dealsByStage = await db.raw(`
      SELECT COALESCE(stage, 'unknown') as stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
      FROM deals
      GROUP BY stage
    `);

    // Lead status distribution
    const leadsByStatus = await db.raw(`
      SELECT status, COUNT(*) as count FROM leads GROUP BY status
    `);

    // Conversion funnel
    const totalLeads = (await db.row('SELECT COUNT(*) as count FROM leads'))?.count || 0;
    const convertedLeads = (await db.row("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'"))?.count || 0;
    const wonDeals = (await db.row("SELECT COUNT(*) as count FROM deals WHERE stage = 'won'"))?.count || 0;

    // Total pipeline value
    const pipelineValue = (await db.row('SELECT COALESCE(SUM(value), 0) as total FROM deals'))?.total || 0;

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
