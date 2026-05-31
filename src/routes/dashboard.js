import { getSupabase } from '../db/supabase.js';

export async function dashboardRoutes(app) {
  // Charts data for dashboard
  app.get('/api/dashboard/charts', {
    preHandler: [app.requireAuth],
  }, async () => {
    const sb = getSupabase();

    // Leads per month (last 6 months) — fetch all leads and aggregate in JS
    const { data: allLeads } = await sb.from('leads').select('created_at, status');
    const leads = allLeads || [];
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthCounts = {};
    for (const l of leads) {
      const d = new Date(l.created_at);
      if (d >= sixMonthsAgo) {
        const m = d.toISOString().slice(0, 7);
        monthCounts[m] = (monthCounts[m] || 0) + 1;
      }
    }
    const leadsByMonth = Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    // Deals by stage
    const { data: allDeals } = await sb.from('deals').select('stage, value');
    const deals = allDeals || [];
    const stageMap = {};
    for (const d of deals) {
      const s = d.stage || 'unknown';
      if (!stageMap[s]) stageMap[s] = { stage: s, count: 0, total_value: 0 };
      stageMap[s].count++;
      stageMap[s].total_value += (Number(d.value) || 0);
    }
    const dealsByStage = Object.values(stageMap);
    const wonDeals = deals.filter(d => d.stage === 'won').length;

    // Lead status distribution
    const statusMap = {};
    for (const l of leads) {
      const s = l.status || 'unknown';
      statusMap[s] = (statusMap[s] || 0) + 1;
    }
    const leadsByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;

    // Pipeline total
    const pipelineValue = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);

    return {
      leads_by_month: leadsByMonth,
      deals_by_stage: dealsByStage,
      leads_by_status: leadsByStatus,
      funnel: { total_leads: totalLeads, converted_leads: convertedLeads, won_deals: wonDeals },
      pipeline_total: pipelineValue,
    };
  });
}
