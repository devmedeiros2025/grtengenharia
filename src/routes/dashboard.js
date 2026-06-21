import * as bi from '../services/bi-service.js';
import db from '../db/adapter.js';

export async function dashboardRoutes(app) {
  app.get('/api/dashboard/charts', {
    preHandler: [app.requireAuth],
  }, async () => {
    const [leadsByMonth, dealsByStageResult, leadsByStatus, funnel, pipelineTotal, fleetUtilization, leadsBySource, topClients] = await Promise.all([
      bi.getLeadsByMonth(6),
      bi.getDealsByStage(),
      bi.getLeadsByStatus(),
      bi.getFunnel(),
      bi.getPipelineTotal(),
      bi.getFleetUtilization(),
      bi.getLeadsBySource(),
      bi.getTopClients(5),
    ]);

    return {
      leads_by_month: leadsByMonth,
      deals_by_stage: dealsByStageResult.stages,
      leads_by_status: leadsByStatus,
      funnel,
      pipeline_total: pipelineTotal.pipeline_total,
      fleet_utilization: fleetUtilization,
      leads_by_source: leadsBySource,
      top_clients: topClients,
    };
  });

  app.get('/api/dashboard/summary', {
    preHandler: [app.requireAuth],
  }, async () => {
    const [totalLeads, totalDeals, totalCompanies, totalEquipment, totalContracts, totalInvoices] = await Promise.all([
      db.count('leads'),
      db.count('deals'),
      db.count('companies'),
      db.count('equipment'),
      db.count('contracts'),
      db.count('invoices'),
    ]);

    const [newLeadsThisMonth, activeDeals, activeContracts, pendingInvoices] = await Promise.all([
      db.count('leads', [{ field: 'created_at', op: 'gte', value: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() }]),
      db.count('deals', [{ field: 'stage', op: 'in', value: ['prospeccacao', 'qualificacao', 'proposta', 'negociacao'] }]),
      db.count('contracts', [{ field: 'status', op: 'eq', value: 'active' }]),
      db.count('invoices', [{ field: 'status', op: 'eq', value: 'pending' }]),
    ]);

    return {
      totals: { totalLeads, totalDeals, totalCompanies, totalEquipment, totalContracts, totalInvoices },
      this_month: { newLeadsThisMonth, activeDeals, activeContracts, pendingInvoices },
    };
  });

  app.get('/api/dashboard/funnel', {
    preHandler: [app.requireAuth],
  }, async () => {
    const [visitors, totalLeads, qualifiedLeads, proposalsSent, contractsWon] = await Promise.all([
      db.count('leads', [{ field: 'source', op: 'in', value: ['meta_ads', 'google_ads', 'landing_page', 'organic'] }]),
      db.count('leads'),
      db.count('leads', [{ field: 'status', op: 'in', value: ['em_qualificacao', 'reuniao_agendada'] }]),
      db.count('deals', [{ field: 'stage', op: 'in', value: ['proposta', 'negociacao'] }]),
      db.count('deals', [{ field: 'stage', op: 'eq', value: 'won' }]),
    ]);

    const convLeadToQualified = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0;
    const convQualifiedToProposal = qualifiedLeads > 0 ? ((proposalsSent / qualifiedLeads) * 100).toFixed(1) : 0;
    const convProposalToWon = proposalsSent > 0 ? ((contractsWon / proposalsSent) * 100).toFixed(1) : 0;

    return {
      stages: [
        { name: 'Visitantes (Fontes)', count: visitors, color: '#00bcd4' },
        { name: 'Leads Capturados', count: totalLeads, color: '#2196f3' },
        { name: 'Qualificados', count: qualifiedLeads, color: '#ff9800' },
        { name: 'Propostas Enviadas', count: proposalsSent, color: '#9c27b0' },
        { name: 'Contratos Fechados', count: contractsWon, color: '#4caf50' },
      ],
      conversion_rates: {
        lead_to_qualified: parseFloat(convLeadToQualified),
        qualified_to_proposal: parseFloat(convQualifiedToProposal),
        proposal_to_won: parseFloat(convProposalToWon),
      },
    };
  });

  app.get('/api/dashboard/activity', {
    preHandler: [app.requireAuth],
  }, async () => {
    const [recentLeads, recentDeals, expiringContracts, pendingProposals] = await Promise.all([
      db.select('leads', {
        columns: 'id, name, company, source, status, created_at',
        orderBy: ['created_at', 'desc'],
        limit: 5,
      }),
      db.select('deals', {
        columns: 'id, title, value, stage, company_id, created_at',
        orderBy: ['created_at', 'desc'],
        limit: 5,
      }),
      db.select('contracts', {
        columns: 'id, title, company_id, end_date, status',
        conditions: [{ field: 'status', op: 'eq', value: 'active' }],
        orderBy: ['end_date', 'asc'],
        limit: 5,
      }),
      db.select('proposals', {
        columns: 'id, title, company_id, value, status, created_at',
        conditions: [{ field: 'status', op: 'in', value: ['draft', 'sent'] }],
        orderBy: ['created_at', 'desc'],
        limit: 5,
      }),
    ]);

    const companyIds = [...new Set([
      ...recentDeals.map(d => d.company_id).filter(Boolean),
      ...expiringContracts.map(c => c.company_id).filter(Boolean),
      ...pendingProposals.map(p => p.company_id).filter(Boolean),
    ])];

    let companies = [];
    if (companyIds.length > 0) {
      companies = await db.select('companies', {
        columns: 'id, name',
        conditions: [{ field: 'id', op: 'in', value: companyIds }],
      });
    }
    const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]));

    return {
      recent_leads: recentLeads,
      recent_deals: recentDeals.map(d => ({ ...d, company_name: companyMap[d.company_id] || null })),
      expiring_contracts: expiringContracts.map(c => ({ ...c, company_name: companyMap[c.company_id] || null })),
      pending_proposals: pendingProposals.map(p => ({ ...p, company_name: companyMap[p.company_id] || null })),
    };
  });

  app.get('/api/dashboard/marketing', {
    preHandler: [app.requireAuth],
  }, async () => {
    const [leadsBySource, campaigns] = await Promise.all([
      bi.getLeadsBySource(),
      db.select('campaigns', {
        columns: 'id, name, type, status, sent_count, open_count, click_count, created_at',
        orderBy: ['created_at', 'desc'],
        limit: 5,
      }),
    ]);

    return {
      leads_by_source: leadsBySource,
      recent_campaigns: campaigns,
    };
  });
}
