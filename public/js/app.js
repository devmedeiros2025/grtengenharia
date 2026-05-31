/* ═══════════════════════════════════════════════════════════════════════════
   GRT CRM — Frontend Application
   ═══════════════════════════════════════════════════════════════════════════ */

const API = '/api';

let state = {
  token: localStorage.getItem('grt_token') || null,
  user: null,
  leads: [],
  deals: [],
  companies: [],
  tasks: [],
  inbounds: [],
  outbounds: [],
  apikeys: [],
  logs: [],
  stages: [],
  notifications: [],
  routines: [],
};

/* ── HTTP helpers ────────────────────────────────────────────────────────── */

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { throw new Error(data.error || `Erro ${res.status}`); }
  return data;
}

/* ── Toast ───────────────────────────────────────────────────────────────── */

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container') || document.body;
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.textContent = msg;
  container.appendChild(div);
  requestAnimationFrame(() => div.classList.add('show'));
  setTimeout(() => { div.classList.remove('show'); setTimeout(() => div.remove(), 300); }, 3500);
}

/* ── Auth ────────────────────────────────────────────────────────────────── */

async function login(username, password) {
  const data = await api('POST', '/auth/login', { username, password });
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('grt_token', data.token);
  showApp();
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('grt_token');
  showLogin();
}

/* ── Navigation ──────────────────────────────────────────────────────────── */

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById(`page-${page}`);
  if (pg) pg.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');
  const titles = { dashboard: 'Dashboard', deals: 'Pipeline', leads: 'Leads', companies: 'Empresas', tasks: 'Tarefas', 'daily-routines': 'Rotinas Diárias', equipment: 'Equipamentos', 'service-orders': 'Ordens de Serviço', contracts: 'Contratos', calendar: 'Calendário', webhooks: 'Webhooks', apikeys: 'API Keys', logs: 'Logs', bi: 'BI Analytics', invoices: 'Faturamento', proposals: 'Propostas', projects: 'Obras & Projetos', tickets: 'Chamados', rental: 'Locação', campaigns: 'Campanhas', followups: 'Pós-Venda', hunter: 'Hunter' };
  document.getElementById('page-title').textContent = titles[page] || page;
  // load data
  if (page === 'dashboard') loadDashboard();
  if (page === 'leads') loadLeads();
  if (page === 'deals') { if (!state.companies || state.companies.length === 0) loadCompanies(); loadDeals(); }
  if (page === 'companies') loadCompanies();
  if (page === 'tasks') loadTasks();
  if (page === 'daily-routines') loadDailyRoutines();
  if (page === 'webhooks') loadWebhooks();
  if (page === 'apikeys') loadApiKeys();
  if (page === 'logs') loadLogs();
}

/* ── UI show/hide ────────────────────────────────────────────────────────── */

function showLogin() {
  document.getElementById('page-login').style.display = 'flex';
  document.getElementById('page-app').style.display = 'none';
}

function showApp() {
  document.getElementById('page-login').style.display = 'none';
  document.getElementById('page-app').style.display = 'flex';
  document.getElementById('user-display').textContent = state.user?.username || 'admin';
  navigate('dashboard');
}

/* ── Modal helpers ───────────────────────────────────────────────────────── */

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.close-modal').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  });
});
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
});

/* ── LEADS ───────────────────────────────────────────────────────────────── */

async function loadLeads() {
  try {
    const res = await api('GET', '/leads');
    state.leads = Array.isArray(res) ? res : (res.leads || []);
    renderLeads();
  } catch (e) { toast(e.message, 'error'); }
}

function renderLeads() {
  const tbody = document.getElementById('leads-tbody');
  const empty = document.getElementById('leads-empty');
  const search = document.getElementById('lead-search').value.toLowerCase();
  const statusFilter = document.getElementById('lead-filter-status').value;

  let filtered = state.leads;
  if (search) filtered = filtered.filter(l =>
    (l.name || '').toLowerCase().includes(search) ||
    (l.company || '').toLowerCase().includes(search) ||
    (l.email || '').toLowerCase().includes(search)
  );
  if (statusFilter) filtered = filtered.filter(l => l.status === statusFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td><strong>${esc(l.name)}</strong></td>
      <td>${esc(l.company || '—')}</td>
      <td>${esc(l.email || '—')}</td>
      <td>${esc(l.phone || '—')}</td>
      <td><span class="badge badge-${l.status}">${statusLabel(l.status)}</span></td>
      <td>${esc(l.source || '—')}</td>
      <td>${fmtDate(l.created_at)}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editLead('${l.id}')" title="Editar">✎</button>
        <button class="btn-icon" onclick="deleteLead('${l.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </td>
    </tr>
  `).join('');
}

function statusLabel(s) {
  const m = { new: 'Novo', qualified: 'Qualificado', converted: 'Convertido', lost: 'Perdido' };
  return m[s] || s;
}

async function loadDashboard() {
  try {
    // Stats
    const stats = await api('GET', '/leads/stats/summary');
    document.getElementById('stat-total').textContent = stats.total ?? '—';
    document.getElementById('stat-new').textContent = stats.byStatus?.new ?? stats.new ?? '—';
    document.getElementById('stat-converted').textContent = stats.byStatus?.converted ?? stats.converted ?? '—';
    document.getElementById('stat-lost').textContent = stats.byStatus?.lost ?? stats.lost ?? '—';
    document.getElementById('lead-count-badge').textContent = stats.total ?? 0;

    // Deals stats
    try {
      const dealsRes = await api('GET', '/deals');
      state.deals = Array.isArray(dealsRes) ? dealsRes : (dealsRes.deals || []);
      const won = state.deals.filter(d => d.stage === 'closed_won');
      const pipelineTotal = state.deals.reduce((s, d) => s + (parseFloat(d.value) || 0), 0);
      document.getElementById('stat-deals-won').textContent = won.length;
      document.getElementById('stat-deals-value').textContent = fmtCurrency(pipelineTotal);
    } catch {}
    try {
      document.getElementById('stat-deals-won').textContent = '—';
      document.getElementById('stat-deals-value').textContent = '—';
    } catch {}

    // Companies count
    try {
      const compRes = await api('GET', '/companies');
      state.companies = Array.isArray(compRes) ? compRes : (compRes.companies || []);
      document.getElementById('stat-companies').textContent = state.companies.length;
    } catch { document.getElementById('stat-companies').textContent = '—'; }

    // Tasks pending
    try {
      state.tasks = await api('GET', '/tasks');
      const pending = state.tasks.filter(t => t.status !== 'done').length;
      document.getElementById('stat-tasks-pending').textContent = pending;
      document.getElementById('task-count-badge').textContent = pending;
    } catch { document.getElementById('stat-tasks-pending').textContent = '—'; }

    // Recent leads
    const leadsRes = await api('GET', '/leads');
    state.leads = Array.isArray(leadsRes) ? leadsRes : (leadsRes.leads || []);
    const recent = state.leads.slice(0, 5);
    const tbody = document.getElementById('dash-leads-tbody');
    const empty = document.getElementById('dash-empty');
    if (recent.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = recent.map(l => `
      <tr>
        <td><strong>${esc(l.name)}</strong></td>
        <td>${esc(l.company || '—')}</td>
        <td><span class="badge badge-${l.status}">${statusLabel(l.status)}</span></td>
        <td>${esc(l.source || '—')}</td>
        <td>${fmtDate(l.created_at)}</td>
      </tr>
    `).join('');
  } catch (e) { /* silently fail on dashboard load */ }
}

function openLeadModal(lead) {
  document.getElementById('modal-lead-title').textContent = lead ? 'Editar Lead' : 'Novo Lead';
  document.getElementById('lead-id').value = lead ? lead.id : '';
  document.getElementById('lead-name').value = lead ? (lead.name || '') : '';
  document.getElementById('lead-company').value = lead ? (lead.company || '') : '';
  document.getElementById('lead-email').value = lead ? (lead.email || '') : '';
  document.getElementById('lead-phone').value = lead ? (lead.phone || '') : '';
  document.getElementById('lead-status').value = lead ? (lead.status || 'new') : 'new';
  document.getElementById('lead-source').value = lead ? (lead.source || '') : '';
  document.getElementById('lead-notes').value = lead ? (lead.notes || '') : '';
  openModal('modal-lead');
  // Load files for this lead
  if (lead && lead.id) loadFiles('lead', lead.id);
}

function editLead(id) {
  const lead = state.leads.find(l => l.id === id);
  if (lead) openLeadModal(lead);
}

async function deleteLead(id) {
  if (!confirm('Excluir este lead permanentemente?')) return;
  try {
    await api('DELETE', `/leads/${id}`);
    toast('Lead excluído', 'success');
    loadLeads();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-lead').addEventListener('click', () => openLeadModal(null));

document.getElementById('modal-lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('lead-id').value;
  const body = {
    name: document.getElementById('lead-name').value,
    company: document.getElementById('lead-company').value,
    email: document.getElementById('lead-email').value,
    phone: document.getElementById('lead-phone').value,
    status: document.getElementById('lead-status').value,
    source: document.getElementById('lead-source').value,
    notes: document.getElementById('lead-notes').value,
  };
  try {
    if (id) {
      await api('PATCH', `/leads/${id}`, body);
      toast('Lead atualizado', 'success');
    } else {
      await api('POST', '/leads', body);
      toast('Lead criado', 'success');
    }
    closeModal('modal-lead');
    loadLeads();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
});

document.getElementById('lead-search').addEventListener('input', renderLeads);
document.getElementById('lead-filter-status').addEventListener('change', renderLeads);
document.getElementById('btn-refresh-leads').addEventListener('click', loadLeads);

/* ── COMPANIES ───────────────────────────────────────────────────────────── */

/* ── Pagination state ────────────────────────────────────────────────────── */

const pagination = {
  companies: { page: 1, limit: 10, total: 0, totalPages: 0 },
  deals: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

function paginationContainer(key, loadFn) {
  const p = pagination[key];
  const btn = (page, label, active) =>
    `<button class="page-btn${active ? ' active' : ''}" onclick="${loadFn.name}(${page})" ${page < 1 || page > p.totalPages ? 'disabled' : ''}>${esc(label)}</button>`;
  return `
    <div class="pagination">
      ${btn(p.page - 1, '‹ Anterior')}
      ${btn(1, '1')}
      ${p.totalPages > 1 && p.page > 3 ? '<span class="page-info">…</span>' : ''}
      ${p.page > 2 && p.page < p.totalPages ? btn(p.page, p.page) : ''}
      ${p.totalPages > 1 && p.page < p.totalPages - 1 ? '<span class="page-info">…</span>' : ''}
      ${p.totalPages > 1 ? btn(p.totalPages, p.totalPages, p.page === p.totalPages) : ''}
      ${btn(p.page + 1, 'Próximo ›')}
      <span class="page-info">Página ${p.page} de ${p.totalPages} (${p.total} itens)</span>
    </div>`;
}

/* ── Loader ──────────────────────────────────────────────────────────────── */

function showLoader() {
  document.getElementById('app-loader').style.display = 'flex';
}

function hideLoader() {
  document.getElementById('app-loader').style.display = 'none';
}

/* ── Dark Mode ──────────────────────────────────────────────────────────── */

function initTheme() {
  const saved = localStorage.getItem('grt_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-icon').textContent = '☀';
    document.getElementById('theme-label').textContent = 'Modo Claro';
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  if (isDark) {
    html.removeAttribute('data-theme');
    localStorage.setItem('grt_theme', 'light');
    document.getElementById('theme-icon').textContent = '☾';
    document.getElementById('theme-label').textContent = 'Modo Escuro';
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('grt_theme', 'dark');
    document.getElementById('theme-icon').textContent = '☀';
    document.getElementById('theme-label').textContent = 'Modo Claro';
  }
}

document.addEventListener('DOMContentLoaded', initTheme);
document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);

/* ── COMPANIES ───────────────────────────────────────────────────────────── */

let companiesPage = 1;

async function loadCompanies(page) {
  if (page) companiesPage = page;
  showLoader();
  try {
    const res = await api('GET', `/companies?page=${companiesPage}&limit=10`);
    state.companies = Array.isArray(res) ? res : (res.companies || []);
    const total = res.total ?? state.companies.length;
    const totalPages = res.totalPages ?? 1;
    pagination.companies = { page: companiesPage, limit: 10, total, totalPages };
    renderCompanies();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderCompanies() {
  const tbody = document.getElementById('companies-tbody');
  const empty = document.getElementById('companies-empty');
  const paginationEl = document.getElementById('companies-pagination');
  const search = document.getElementById('company-search').value.toLowerCase();
  const statusFilter = document.getElementById('company-filter-status').value;

  let filtered = state.companies;
  if (search) filtered = filtered.filter(c =>
    (c.name || '').toLowerCase().includes(search) ||
    (c.email || '').toLowerCase().includes(search) ||
    (c.cnpj || '').toLowerCase().includes(search)
  );
  if (statusFilter) filtered = filtered.filter(c => (c.active !== false) === (statusFilter === 'active'));

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.email || '—')}</td>
      <td>${esc(c.phone || '—')}</td>
      <td>${esc(c.cnpj ? c.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '—')}</td>
      <td>${esc(c.city || '—')}</td>
      <td><span class="badge badge-${c.active !== false ? 'active' : 'inactive'}">${c.active !== false ? 'Ativa' : 'Inativa'}</span></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editCompany('${c.id}')" title="Editar">✎</button>
        <button class="btn-icon" onclick="deleteCompany('${c.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </td>
    </tr>
  `).join('');

  if (paginationEl) paginationEl.innerHTML = paginationContainer('companies', loadCompanies);
}

function openCompanyModal(company) {
  document.getElementById('modal-company-title').textContent = company ? 'Editar Empresa' : 'Nova Empresa';
  document.getElementById('company-id').value = company ? company.id : '';
  document.getElementById('company-name').value = company ? (company.name || '') : '';
  document.getElementById('company-email').value = company ? (company.email || '') : '';
  document.getElementById('company-phone').value = company ? (company.phone || '') : '';
  document.getElementById('company-website').value = company ? (company.website || '') : '';
  document.getElementById('company-cnpj').value = company ? (company.cnpj || '') : '';
  document.getElementById('company-address').value = company ? (company.address || '') : '';
  document.getElementById('company-city').value = company ? (company.city || '') : '';
  document.getElementById('company-state').value = company ? (company.state || '') : '';
  document.getElementById('company-segment').value = company ? (company.segment || '') : '';
  document.getElementById('company-notes').value = company ? (company.notes || '') : '';
  openModal('modal-company');
  // Load files for this company
  if (company && company.id) loadFiles('company', company.id);
}

function editCompany(id) {
  const company = state.companies.find(c => c.id === id);
  if (company) openCompanyModal(company);
}

async function deleteCompany(id) {
  if (!confirm('Excluir esta empresa permanentemente?')) return;
  try {
    await api('DELETE', `/companies/${id}`);
    toast('Empresa excluída', 'success');
    loadCompanies();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-company').addEventListener('click', () => openCompanyModal(null));

document.getElementById('modal-company-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('company-id').value;
  const body = {
    name: document.getElementById('company-name').value,
    email: document.getElementById('company-email').value,
    phone: document.getElementById('company-phone').value,
    website: document.getElementById('company-website').value,
    cnpj: document.getElementById('company-cnpj').value,
    address: document.getElementById('company-address').value,
    city: document.getElementById('company-city').value,
    state: document.getElementById('company-state').value,
    segment: document.getElementById('company-segment').value,
    notes: document.getElementById('company-notes').value,
  };
  try {
    if (id) {
      await api('PATCH', `/companies/${id}`, body);
      toast('Empresa atualizada', 'success');
    } else {
      await api('POST', '/companies', body);
      toast('Empresa criada', 'success');
    }
    closeModal('modal-company');
    loadCompanies();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
});

document.getElementById('company-search').addEventListener('input', renderCompanies);
document.getElementById('company-filter-status').addEventListener('change', renderCompanies);
document.getElementById('btn-refresh-companies').addEventListener('click', loadCompanies);

/* ── DEALS ────────────────────────────────────────────────────────────────── */

let dealsPage = 1;
let dealStages = [
  { key: 'lead_in', label: 'Lead In', color: '#3b82f6' },
  { key: 'qualified', label: 'Qualificado', color: '#8b5cf6' },
  { key: 'proposal', label: 'Proposta', color: '#f59e0b' },
  { key: 'negotiation', label: 'Negociação', color: '#f97316' },
  { key: 'closed_won', label: 'Ganho', color: '#22c55e' },
  { key: 'closed_lost', label: 'Perdido', color: '#ef4444' },
];

async function loadDeals(page) {
  if (page) dealsPage = page;
  showLoader();
  try {
    // Fetch stages from API (dynamic pipeline)
    try {
      const stages = await api('GET', '/deals/stages');
      if (Array.isArray(stages) && stages.length > 0) {
        dealStages = stages.map(s => ({ key: s.key, label: s.label || s.name, color: s.color || '#6b7280' }));
      }
    } catch { /* use default stages */ }

    const res = await api('GET', `/deals?page=${dealsPage}&limit=10`);
    state.deals = Array.isArray(res) ? res : (res.deals || []);
    const total = res.total ?? state.deals.length;
    const totalPages = res.totalPages ?? 1;
    pagination.deals = { page: dealsPage, limit: 10, total, totalPages };
    renderPipeline();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderPipeline() {
  const container = document.getElementById('pipeline-container');
  const empty = document.getElementById('deals-empty');
  const paginationEl = document.getElementById('deals-pagination');

  if (state.deals.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  // Group deals by stage
  const grouped = {};
  dealStages.forEach(s => { grouped[s.key] = []; });
  state.deals.forEach(d => {
    const k = d.stage || 'lead_in';
    if (grouped[k]) grouped[k].push(d);
    else grouped[k] = [d];
  });

  container.innerHTML = dealStages.map(s => {
    const deals = grouped[s.key] || [];
    const total = deals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
    return `
      <div class="pipeline-col" data-stage="${s.key}">
        <div class="pipeline-col-header" style="border-top-color:${s.color}">
          <span>${s.label}</span>
          <span class="pipeline-count">${deals.length}</span>
        </div>
        <div class="pipeline-col-body" ondrop="onDealDrop(event)" ondragover="onDragOver(event)">
          ${deals.length === 0 ? '<div class="pipeline-empty-col">Arraste negócios para cá</div>' : ''}
          ${deals.map(d => `
            <div class="deal-card" draggable="true" ondragstart="onDealDragStart(event, '${d.id}')" onclick="editDeal('${d.id}')">
              <div class="deal-card-title">${esc(d.title)}</div>
              ${d.value ? `<div class="deal-card-value">${fmtCurrency(d.value)}</div>` : ''}
              ${d.company_name ? `<div class="deal-card-company">${esc(d.company_name)}</div>` : ''}
              ${d.contact_name ? `<div class="deal-card-contact">${esc(d.contact_name)}</div>` : ''}
              <div class="deal-card-actions">
                <button class="btn-icon-sm" onclick="event.stopPropagation();deleteDeal('${d.id}')" title="Excluir" style="color:var(--red)">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="pipeline-col-footer">${total > 0 ? fmtCurrency(total) : ''}</div>
      </div>
    `;
  }).join('');

  if (paginationEl) paginationEl.innerHTML = paginationContainer('deals', loadDeals);
}

let draggedDealId = null;

function onDealDragStart(e, id) {
  draggedDealId = id;
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

async function onDealDrop(e) {
  e.preventDefault();
  if (!draggedDealId) return;
  const col = e.currentTarget.closest('.pipeline-col');
  if (!col) return;
  const newStage = col.dataset.stage;
  if (!newStage) return;

  // Optimistic update
  const deal = state.deals.find(d => d.id === draggedDealId);
  if (deal && deal.stage !== newStage) {
    deal.stage = newStage;
    renderPipeline();
    try {
      await api('PATCH', `/deals/${draggedDealId}`, { stage: newStage });
    } catch (e) {
      toast(e.message, 'error');
      loadDeals(); // revert
    }
  }
  draggedDealId = null;
}

function openDealModal(deal) {
  document.getElementById('modal-deal-title').textContent = deal ? 'Editar Negócio' : 'Novo Negócio';
  document.getElementById('deal-id').value = deal ? deal.id : '';
  document.getElementById('deal-title').value = deal ? (deal.title || '') : '';
  document.getElementById('deal-value').value = deal ? (deal.value || '') : '';
  document.getElementById('deal-contact-name').value = deal ? (deal.contact_name || '') : '';
  document.getElementById('deal-contact-email').value = deal ? (deal.contact_email || '') : '';
  document.getElementById('deal-contact-phone').value = deal ? (deal.contact_phone || '') : '';
  document.getElementById('deal-source').value = deal ? (deal.source || '') : '';
  document.getElementById('deal-notes').value = deal ? (deal.notes || '') : '';

  // Populate stage dropdown
  const stageSelect = document.getElementById('deal-stage');
  stageSelect.innerHTML = dealStages.map(s =>
    `<option value="${s.key}" ${(deal && deal.stage === s.key) || (!deal && s.key === 'lead_in') ? 'selected' : ''}>${s.label}</option>`
  ).join('');

  // Populate company dropdown from state
  const companySelect = document.getElementById('deal-company');
  const currentCompany = deal ? deal.company_id : '';
  companySelect.innerHTML = '<option value="">Nenhuma</option>' +
    (state.companies || []).map(c =>
      `<option value="${c.id}" ${c.id === currentCompany ? 'selected' : ''}>${esc(c.name)}</option>`
    ).join('');

  openModal('modal-deal');
  // Load files for this deal
  if (deal && deal.id) loadFiles('deal', deal.id);
}

function editDeal(id) {
  const deal = state.deals.find(d => d.id === id);
  if (deal) openDealModal(deal);
}

async function deleteDeal(id) {
  if (!confirm('Excluir este negócio permanentemente?')) return;
  try {
    await api('DELETE', `/deals/${id}`);
    toast('Negócio excluído', 'success');
    loadDeals();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-deal').addEventListener('click', async () => {
  // Ensure companies are loaded for the dropdown
  if (!state.companies || !Array.isArray(state.companies)) {
    try { const coRes = await api('GET', '/companies'); state.companies = coRes.companies || coRes.data || []; } catch {}
  }
  openDealModal(null);
});

document.getElementById('modal-deal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('deal-id').value;
  const body = {
    title: document.getElementById('deal-title').value,
    value: document.getElementById('deal-value').value ? parseFloat(document.getElementById('deal-value').value) : null,
    stage: document.getElementById('deal-stage').value,
    company_id: document.getElementById('deal-company').value || null,
    contact_name: document.getElementById('deal-contact-name').value,
    contact_email: document.getElementById('deal-contact-email').value,
    contact_phone: document.getElementById('deal-contact-phone').value,
    source: document.getElementById('deal-source').value,
    notes: document.getElementById('deal-notes').value,
  };
  try {
    if (id) {
      await api('PATCH', `/deals/${id}`, body);
      toast('Negócio atualizado', 'success');
    } else {
      await api('POST', '/deals', body);
      toast('Negócio criado', 'success');
    }
    closeModal('modal-deal');
    loadDeals();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── TASKS ────────────────────────────────────────────────────────────────── */

async function loadTasks() {
  try {
    state.tasks = await api('GET', '/tasks');
    renderTasks();
  } catch (e) { toast(e.message, 'error'); }
}

function renderTasks() {
  const tbody = document.getElementById('tasks-tbody');
  const empty = document.getElementById('tasks-empty');
  const statusFilter = document.getElementById('task-filter-status').value;
  const priorityFilter = document.getElementById('task-filter-priority').value;

  let filtered = state.tasks;
  if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
  if (priorityFilter) filtered = filtered.filter(t => t.priority === priorityFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Sort: pending first, then in_progress, then done
  const sortOrder = { pending: 0, in_progress: 1, done: 2 };
  filtered.sort((a, b) => (sortOrder[a.status] ?? 99) - (sortOrder[b.status] ?? 99));

  tbody.innerHTML = filtered.map(t => `
    <tr class="${t.status === 'done' ? 'task-done' : ''}">
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" ${t.status === 'done' ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}', this.checked)" style="cursor:pointer">
          <strong>${esc(t.title)}</strong>
        </div>
        ${t.description ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${esc(t.description.substring(0, 80))}${t.description.length > 80 ? '...' : ''}</div>` : ''}
      </td>
      <td><span class="badge badge-${t.priority || 'medium'}">${priorityLabel(t.priority)}</span></td>
      <td><span class="badge badge-${t.status}">${taskStatusLabel(t.status)}</span></td>
      <td>${t.due_date ? fmtDate(t.due_date) : '—'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editTask('${t.id}')" title="Editar">✎</button>
        <button class="btn-icon" onclick="deleteTask('${t.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('task-count-badge').textContent = state.tasks.filter(t => t.status !== 'done').length;
}

function priorityLabel(p) {
  const m = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  return m[p] || p || 'Média';
}

function taskStatusLabel(s) {
  const m = { pending: 'Pendente', in_progress: 'Em andamento', done: 'Concluída' };
  return m[s] || s || 'Pendente';
}

async function toggleTaskStatus(id, done) {
  try {
    await api('PATCH', `/tasks/${id}`, { status: done ? 'done' : 'pending' });
    loadTasks();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
}

function openTaskModal(task) {
  document.getElementById('modal-task-title').textContent = task ? 'Editar Tarefa' : 'Nova Tarefa';
  document.getElementById('task-id').value = task ? task.id : '';
  document.getElementById('task-title').value = task ? (task.title || '') : '';
  document.getElementById('task-desc').value = task ? (task.description || '') : '';
  document.getElementById('task-status').value = task ? (task.status || 'pending') : 'pending';
  document.getElementById('task-priority').value = task ? (task.priority || 'medium') : 'medium';
  document.getElementById('task-due').value = task ? (task.due_date ? task.due_date.substring(0, 10) : '') : '';
  openModal('modal-task');
}

function editTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) openTaskModal(task);
}

async function deleteTask(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  try {
    await api('DELETE', `/tasks/${id}`);
    toast('Tarefa excluída', 'success');
    loadTasks();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-task').addEventListener('click', () => openTaskModal(null));

document.getElementById('modal-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const body = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    due_date: document.getElementById('task-due').value || null,
  };
  try {
    if (id) {
      await api('PATCH', `/tasks/${id}`, body);
      toast('Tarefa atualizada', 'success');
    } else {
      await api('POST', '/tasks', body);
      toast('Tarefa criada', 'success');
    }
    closeModal('modal-task');
    loadTasks();
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
});

document.getElementById('task-filter-status').addEventListener('change', renderTasks);
document.getElementById('task-filter-priority').addEventListener('change', renderTasks);
document.getElementById('btn-refresh-tasks').addEventListener('click', loadTasks);

/* ── ROTINAS DIÁRIAS / KANBAN ────────────────────────────────────────────── */

function routinePriorityLabel(p) {
  const m = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  return m[p] || p || 'Média';
}

function routineStatusLabel(s) {
  const m = { pending: 'Pendente', in_progress: 'Em Andamento', done: 'Concluída' };
  return m[s] || s || 'Pendente';
}

function formatDateKanban(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR');
}

function isOverdue(d) {
  if (!d) return false;
  const due = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

async function loadDailyRoutines() {
  try {
    state.routines = await api('GET', '/daily-routines');
    renderKanban();
    populateAssigneeFilter();
  } catch (e) { toast(e.message, 'error'); }
}

function populateAssigneeFilter() {
  const sel = document.getElementById('routine-filter-assigned');
  const current = sel.value;
  const assignees = [...new Set(state.routines.map(r => r.assigned_to).filter(Boolean))];
  sel.innerHTML = '<option value="">Todos Responsáveis</option>' +
    assignees.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
  sel.value = current;
}

function filteredRoutines() {
  const priorityFilter = document.getElementById('routine-filter-priority').value;
  const assignedFilter = document.getElementById('routine-filter-assigned').value;
  return state.routines.filter(r => {
    if (priorityFilter && r.priority !== priorityFilter) return false;
    if (assignedFilter && r.assigned_to !== assignedFilter) return false;
    return true;
  });
}

function renderKanban() {
  const filtered = filteredRoutines();
  const empty = document.getElementById('routines-empty');
  const board = document.getElementById('kanban-board');

  const hasItems = filtered.length > 0;
  board.style.display = hasItems ? 'grid' : 'none';
  empty.style.display = hasItems ? 'none' : 'block';

  const columns = { pending: [], in_progress: [], done: [] };
  for (const r of filtered) {
    if (columns[r.status]) columns[r.status].push(r);
  }

  for (const [status, items] of Object.entries(columns)) {
    const body = document.getElementById(`kanban-${status}`);
    const countEl = document.getElementById(`count-${status}`);
    countEl.textContent = items.length;

    if (items.length === 0) {
      body.innerHTML = `<div class="kanban-column-empty"><div class="empty-icon">📋</div><span>Nenhuma rotina</span></div>`;
      continue;
    }

    body.innerHTML = items.map(r => `
      <div class="kanban-card" draggable="true" data-id="${r.id}" data-status="${r.status}">
        <div class="kanban-card-title">${esc(r.title)}</div>
        ${r.description ? `<div class="kanban-card-desc">${esc(r.description.substring(0, 100))}${r.description.length > 100 ? '...' : ''}</div>` : ''}
        <div style="margin-bottom:6px">
          <span class="badge badge-${r.priority || 'medium'}">${routinePriorityLabel(r.priority)}</span>
        </div>
        <div class="kanban-card-meta">
          <div class="kanban-card-assignee">👤 ${esc(r.assigned_to || 'Não atribuído')}</div>
          ${r.due_date ? `<div class="kanban-card-due ${isOverdue(r.due_date) && status !== 'done' ? 'overdue' : ''}">📅 ${formatDateKanban(r.due_date)}</div>` : ''}
          <div class="kanban-card-actions">
            <button onclick="editRoutine(${r.id})" title="Editar">✎</button>
            <button class="btn-del" onclick="deleteRoutine(${r.id})" title="Excluir">✕</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Attach drag events
  document.querySelectorAll('.kanban-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend', onDragEnd);
  });
  document.querySelectorAll('.kanban-body').forEach(body => {
    body.addEventListener('dragover', onDragOver);
    body.addEventListener('dragenter', onDragEnter);
    body.addEventListener('dragleave', onDragLeave);
    body.addEventListener('drop', onDrop);
  });

  updateRoutineBadge();
}

function updateRoutineBadge() {
  const pending = state.routines.filter(r => r.status !== 'done').length;
  const badge = document.getElementById('routine-count-badge');
  if (badge) {
    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'inline' : 'none';
  }
}

let draggedCard = null;

function onDragStart(e) {
  draggedCard = e.target.closest('.kanban-card');
  if (!draggedCard) return;
  draggedCard.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedCard.dataset.id);
}

function onDragEnd(e) {
  const card = e.target.closest('.kanban-card');
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.kanban-body').forEach(b => b.classList.remove('drag-over'));
  draggedCard = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDragEnter(e) {
  const body = e.target.closest('.kanban-body');
  if (body) body.classList.add('drag-over');
}

function onDragLeave(e) {
  const body = e.target.closest('.kanban-body');
  if (body && !body.contains(e.relatedTarget)) body.classList.remove('drag-over');
}

async function onDrop(e) {
  e.preventDefault();
  const body = e.target.closest('.kanban-body');
  if (!body) return;
  body.classList.remove('drag-over');

  const id = e.dataTransfer.getData('text/plain');
  const newStatus = body.closest('.kanban-column').dataset.status;
  if (!id || !newStatus) return;

  const card = document.querySelector(`.kanban-card[data-id="${id}"]`);
  const oldStatus = card ? card.dataset.status : null;
  if (oldStatus === newStatus) return;

  try {
    await api('PATCH', `/daily-routines/${id}`, { status: newStatus });
    toast(`Rotina movida para ${routineStatusLabel(newStatus)}`, 'success');
    loadDailyRoutines();
  } catch (e) { toast(e.message, 'error'); }
}

/* ── Modal CRUD ─────────────────────────────────────────────────────────── */

function openRoutineModal(routine) {
  document.getElementById('modal-routine-title').textContent = routine ? 'Editar Rotina' : 'Nova Rotina';
  document.getElementById('routine-id').value = routine ? routine.id : '';
  document.getElementById('routine-title').value = routine ? (routine.title || '') : '';
  document.getElementById('routine-desc').value = routine ? (routine.description || '') : '';
  document.getElementById('routine-status').value = routine ? (routine.status || 'pending') : 'pending';
  document.getElementById('routine-priority').value = routine ? (routine.priority || 'medium') : 'medium';
  document.getElementById('routine-assigned').value = routine ? (routine.assigned_to || '') : '';
  document.getElementById('routine-due').value = routine ? (routine.due_date ? routine.due_date.substring(0, 10) : '') : '';
  openModal('modal-routine');
}

function editRoutine(id) {
  const routine = state.routines.find(r => r.id === id);
  if (routine) openRoutineModal(routine);
}

async function deleteRoutine(id) {
  if (!confirm('Excluir esta rotina?')) return;
  try {
    await api('DELETE', `/daily-routines/${id}`);
    toast('Rotina excluída', 'success');
    loadDailyRoutines();
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-routine').addEventListener('click', () => openRoutineModal(null));
document.getElementById('btn-refresh-routines').addEventListener('click', loadDailyRoutines);

document.getElementById('routine-filter-priority').addEventListener('change', renderKanban);
document.getElementById('routine-filter-assigned').addEventListener('change', renderKanban);

document.getElementById('modal-routine-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('routine-id').value;
  const body = {
    title: document.getElementById('routine-title').value,
    description: document.getElementById('routine-desc').value,
    status: document.getElementById('routine-status').value,
    priority: document.getElementById('routine-priority').value,
    assigned_to: document.getElementById('routine-assigned').value || null,
    due_date: document.getElementById('routine-due').value || null,
  };
  try {
    if (id) {
      await api('PATCH', `/daily-routines/${id}`, body);
      toast('Rotina atualizada', 'success');
    } else {
      await api('POST', '/daily-routines', body);
      toast('Rotina criada', 'success');
    }
    closeModal('modal-routine');
    loadDailyRoutines();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── WEBHOOKS ────────────────────────────────────────────────────────────── */

async function loadWebhooks() {
  try {
    const data = await api('GET', '/settings/webhooks');
    state.inbounds = data.inbound || [];
    state.outbounds = data.outbound || [];
    renderInbounds();
    renderOutbounds();
  } catch (e) { toast(e.message, 'error'); }
}

function renderInbounds() {
  const list = document.getElementById('inbound-list');
  const empty = document.getElementById('inbound-empty');
  if (state.inbounds.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = state.inbounds.map(w => {
    const url = `${location.origin}/api/webhooks/inbound/${w.token}`;
    return `
      <div class="webhook-card">
        <div class="webhook-info">
          <strong>${esc(w.name)}</strong>
          <div class="url">${url}</div>
          <div class="meta">${esc(w.description || '')}</div>
          <div class="token">token: ${w.token}</div>
          <div class="meta">Criado ${fmtDate(w.created_at)}</div>
        </div>
        <div class="webhook-actions">
          <button class="btn-icon" onclick="copyText('${url}')" title="Copiar URL">📋</button>
          <button class="btn-icon" onclick="deleteInbound('${w.id}')" title="Excluir" style="color:var(--red)">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderOutbounds() {
  const list = document.getElementById('outbound-list');
  const empty = document.getElementById('outbound-empty');
  if (state.outbounds.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = state.outbounds.map(w => `
    <div class="webhook-card">
      <div class="webhook-info">
        <strong>${esc(w.name)}</strong>
        <div class="url">${esc(w.url)}</div>
        <div class="meta">Eventos: ${esc(w.events)}</div>
        <div class="meta">Criado ${fmtDate(w.created_at)}</div>
      </div>
      <div class="webhook-actions">
        <button class="btn-icon" onclick="deleteOutbound('${w.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </div>
    </div>
  `).join('');
}

async function deleteInbound(id) {
  if (!confirm('Excluir este webhook inbound?')) return;
  try {
    await api('DELETE', `/settings/webhooks/inbound/${id}`);
    toast('Webhook excluído', 'success');
    loadWebhooks();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteOutbound(id) {
  if (!confirm('Excluir este webhook outbound?')) return;
  try {
    await api('DELETE', `/settings/webhooks/outbound/${id}`);
    toast('Webhook excluído', 'success');
    loadWebhooks();
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-inbound').addEventListener('click', () => {
  document.getElementById('inbound-id').value = '';
  document.getElementById('inbound-name').value = '';
  document.getElementById('inbound-desc').value = '';
  openModal('modal-inbound');
});

document.getElementById('modal-inbound-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: document.getElementById('inbound-name').value,
    description: document.getElementById('inbound-desc').value,
  };
  try {
    await api('POST', '/settings/webhooks/inbound', body);
    toast('Webhook inbound criado', 'success');
    closeModal('modal-inbound');
    loadWebhooks();
  } catch (e) { toast(e.message, 'error'); }
});

document.getElementById('btn-new-outbound').addEventListener('click', () => {
  document.getElementById('outbound-id').value = '';
  document.getElementById('outbound-name').value = '';
  document.getElementById('outbound-url').value = '';
  document.querySelectorAll('#modal-outbound-form input[type="checkbox"]').forEach(c => c.checked = c.value === 'lead.created');
  openModal('modal-outbound');
});

document.getElementById('modal-outbound-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const events = Array.from(document.querySelectorAll('#modal-outbound-form input[type="checkbox"]:checked')).map(c => c.value);
  const body = {
    name: document.getElementById('outbound-name').value,
    url: document.getElementById('outbound-url').value,
    events,
  };
  try {
    await api('POST', '/settings/webhooks/outbound', body);
    toast('Webhook outbound criado', 'success');
    closeModal('modal-outbound');
    loadWebhooks();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── Tabs ────────────────────────────────────────────────────────────────── */

document.querySelectorAll('.tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
    document.getElementById(`tab-${target}`).style.display = 'block';
  });
});

/* ── API KEYS ────────────────────────────────────────────────────────────── */

async function loadApiKeys() {
  try {
    state.apikeys = await api('GET', '/settings/api-keys');
    renderApiKeys();
  } catch (e) { toast(e.message, 'error'); }
}

function renderApiKeys() {
  const tbody = document.getElementById('apikeys-tbody');
  const empty = document.getElementById('apikeys-empty');
  if (state.apikeys.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = state.apikeys.map(k => `
    <tr>
      <td><strong>${esc(k.name)}</strong></td>
      <td style="font-family:var(--font-mono);font-size:12px">${esc(k.key_prefix || (k.key ? k.key.substring(0, 20) + '...' : ''))}</td>
      <td><span class="badge badge-${k.active ? 'active' : 'inactive'}">${k.active ? 'Ativa' : 'Inativa'}</span></td>
      <td>${fmtDate(k.created_at)}</td>
      <td style="text-align:right">
        <button class="btn-icon" onclick="toggleApiKey('${k.id}')" title="${k.active ? 'Desativar' : 'Ativar'}">${k.active ? '⊘' : '✓'}</button>
        <button class="btn-icon" onclick="deleteApiKey('${k.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </td>
    </tr>
  `).join('');
}

async function toggleApiKey(id) {
  try {
    const res = await api('PATCH', `/settings/api-keys/${id}`);
    toast(res.active ? 'Chave ativada' : 'Chave desativada', 'success');
    loadApiKeys();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteApiKey(id) {
  if (!confirm('Excluir esta API key?')) return;
  try {
    await api('DELETE', `/settings/api-keys/${id}`);
    toast('API key excluída', 'success');
    loadApiKeys();
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-apikey').addEventListener('click', () => {
  document.getElementById('apikey-name').value = '';
  openModal('modal-apikey');
});

document.getElementById('modal-apikey-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('apikey-name').value;
  try {
    const res = await api('POST', '/settings/api-keys', { name });
    closeModal('modal-apikey');
    document.getElementById('showkey-value').textContent = res.key;
    openModal('modal-showkey');
    loadApiKeys();
  } catch (e) { toast(e.message, 'error'); }
});

document.getElementById('btn-copy-key').addEventListener('click', () => {
  const key = document.getElementById('showkey-value').textContent;
  navigator.clipboard.writeText(key).then(() => {
    toast('Chave copiada!', 'success');
    closeModal('modal-showkey');
  }).catch(() => {
    // fallback
    const el = document.getElementById('showkey-value');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    toast('Selecione e copie manualmente', 'info');
  });
});

/* ── LOGS ───────────────────────────────────────────────────────────────── */

async function loadLogs() {
  try {
    state.logs = await api('GET', '/settings/webhooks/logs');
    renderLogs();
  } catch (e) { toast(e.message, 'error'); }
}

function renderPayloadPreview(payload) {
  try {
    const obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const str = JSON.stringify(obj);
    return `<div style="color:var(--text-muted);font-size:10px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;max-height:40px">${esc(str.substring(0, 200))}</div>`;
  } catch {
    return `<div style="color:var(--text-muted);font-size:10px;margin-top:2px">${esc(String(payload).substring(0, 200))}</div>`;
  }
}

function renderLogs() {
  const list = document.getElementById('logs-list');
  const empty = document.getElementById('logs-empty');
  if (state.logs.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = state.logs.map(l => {
    const dir = l.direction === 'inbound' ? 'inbound' : 'outbound';
    const ok = l.status === 'success' || l.status === 'ok';
    return `
      <div class="log-entry">
        <div>
          <span class="log-direction ${dir}">${l.direction === 'inbound' ? '⬅ IN' : '➡ OUT'}</span>
          <span class="log-status ${ok ? 'ok' : 'fail'}">${ok ? '✓' : '✗'}</span>
          <span style="color:var(--text-secondary)">${esc(l.webhook_name || l.endpoint || '')}</span>
        </div>
        <div class="log-meta">${fmtDate(l.created_at)} · ${l.direction === 'inbound' ? 'Recebido' : esc(l.endpoint || '')} · ${esc(l.status)}${l.status_code ? ' (' + l.status_code + ')' : ''}</div>
        ${l.payload ? renderPayloadPreview(l.payload) : ''}
      </div>
    `;
  }).join('');
}

document.getElementById('btn-refresh-logs').addEventListener('click', loadLogs);

/* ── FASE 3 — EQUIPMENT ──────────────────────────────────────────────── */

async function loadEquipment() {
  showLoader();
  try {
    const search = document.getElementById('equipment-search')?.value;
    const status = document.getElementById('equipment-filter-status')?.value;
    const res = await api('GET', '/equipment?page=1&limit=100' + (status ? '&status=' + status : '') + (search ? '&search=' + encodeURIComponent(search) : ''));
    state.equipment = res.equipment || [];
    renderEquipment();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderEquipment() {
  const tbody = document.getElementById('equipment-tbody');
  const empty = document.getElementById('equipment-empty');
  if (!tbody) return;
  const list = state.equipment || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { available: 'Disponível', in_use: 'Em Uso', maintenance: 'Manutenção' };
  tbody.innerHTML = list.map(e => `
    <tr>
      <td><strong>${esc(e.name)}</strong></td>
      <td>${esc(e.type || '—')}</td>
      <td>${esc(e.brand || '')} ${esc(e.model || '')}</td>
      <td>${esc(e.plate || '—')}</td>
      <td><span class="badge badge-${e.status}">${statusMap[e.status] || e.status}</span></td>
      <td style="text-align:right">${e.daily_rate ? fmtCurrency(e.daily_rate) + '/dia' : '—'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editEquipment('${e.id}')" title="Editar">✎</button>
        <button class="btn-icon" onclick="deleteEquipment('${e.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </td>
    </tr>
  `).join('');
}

function openEquipmentModal(item) {
  document.getElementById('modal-equipment-title').textContent = item ? 'Editar Equipamento' : 'Novo Equipamento';
  document.getElementById('equipment-id').value = item ? item.id : '';
  document.getElementById('equipment-name').value = item ? (item.name || '') : '';
  document.getElementById('equipment-type').value = item ? (item.type || '') : '';
  document.getElementById('equipment-brand').value = item ? (item.brand || '') : '';
  document.getElementById('equipment-model').value = item ? (item.model || '') : '';
  document.getElementById('equipment-year').value = item ? (item.year || '') : '';
  document.getElementById('equipment-plate').value = item ? (item.plate || '') : '';
  document.getElementById('equipment-daily').value = item ? (item.daily_rate || '') : '';
  document.getElementById('equipment-status').value = item ? (item.status || 'available') : 'available';
  document.getElementById('equipment-notes').value = item ? (item.notes || '') : '';
  openModal('modal-equipment');
}

function editEquipment(id) {
  const item = state.equipment?.find(e => e.id === id);
  if (item) openEquipmentModal(item);
}

async function deleteEquipment(id) {
  if (!confirm('Excluir este equipamento?')) return;
  try { await api('DELETE', `/equipment/${id}`); toast('Excluído', 'success'); loadEquipment(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-equipment')?.addEventListener('click', () => openEquipmentModal(null));
document.getElementById('btn-refresh-equipment')?.addEventListener('click', loadEquipment);
document.getElementById('equipment-search')?.addEventListener('input', loadEquipment);
document.getElementById('equipment-filter-status')?.addEventListener('change', loadEquipment);
document.getElementById('modal-equipment-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('equipment-id').value;
  const body = {
    name: document.getElementById('equipment-name').value,
    type: document.getElementById('equipment-type').value,
    brand: document.getElementById('equipment-brand').value,
    model: document.getElementById('equipment-model').value,
    year: document.getElementById('equipment-year').value ? parseInt(document.getElementById('equipment-year').value) : null,
    plate: document.getElementById('equipment-plate').value,
    daily_rate: parseFloat(document.getElementById('equipment-daily').value) || 0,
    status: document.getElementById('equipment-status').value,
    notes: document.getElementById('equipment-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/equipment/${id}`, body); toast('Atualizado', 'success'); }
    else { await api('POST', '/equipment', body); toast('Criado', 'success'); }
    closeModal('modal-equipment'); loadEquipment();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── FASE 3 — SERVICE ORDERS ─────────────────────────────────────────── */

async function loadServiceOrders() {
  showLoader();
  try {
    const status = document.getElementById('so-filter-status')?.value;
    const priority = document.getElementById('so-filter-priority')?.value;
    let url = '/service-orders?page=1&limit=100';
    if (status) url += '&status=' + status;
    if (priority) url += '&priority=' + priority;
    const res = await api('GET', url);
    state.orders = res.orders || [];
    renderServiceOrders();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderServiceOrders() {
  const tbody = document.getElementById('so-tbody');
  const empty = document.getElementById('so-empty');
  if (!tbody) return;
  const list = state.orders || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { open: 'Aberta', in_progress: 'Em Andamento', closed: 'Concluída', cancelled: 'Cancelada' };
  const priorityMap = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  tbody.innerHTML = list.map(o => `
    <tr>
      <td><strong>${esc(o.title)}</strong></td>
      <td>${esc(o.equipment_name || '—')}</td>
      <td>${esc(o.client_name || '—')}</td>
      <td><span class="badge badge-${o.status}">${statusMap[o.status] || o.status}</span></td>
      <td><span class="badge badge-${o.priority || 'medium'}">${priorityMap[o.priority] || o.priority}</span></td>
      <td style="text-align:right">${o.value ? fmtCurrency(o.value) : '—'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editServiceOrder('${o.id}')" title="Editar">✎</button>
        <button class="btn-icon" onclick="deleteServiceOrder('${o.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </td>
    </tr>
  `).join('');
}

async function loadSODropdowns() {
  // Load equipment and companies for dropdowns
  try {
    const eq = await api('GET', '/equipment?page=1&limit=500');
    state.equipment = eq.equipment || [];
    const co = await api('GET', '/companies?page=1&limit=500');
    state.companies = co.companies || [];
  } catch {}
}

function openSOModal(order) {
  document.getElementById('modal-so-title').textContent = order ? 'Editar OS' : 'Nova OS';
  document.getElementById('so-id').value = order ? order.id : '';
  document.getElementById('so-title').value = order ? (order.title || '') : '';
  document.getElementById('so-desc').value = order ? (order.description || '') : '';
  document.getElementById('so-status').value = order ? (order.status || 'open') : 'open';
  document.getElementById('so-priority').value = order ? (order.priority || 'medium') : 'medium';
  document.getElementById('so-value').value = order ? (order.value || '') : '';
  document.getElementById('so-notes').value = order ? (order.notes || '') : '';

  // Populate dropdowns
  const eqSelect = document.getElementById('so-equipment');
  eqSelect.innerHTML = '<option value="">Selecione</option>' + (state.equipment || []).map(e =>
    `<option value="${e.id}" ${order && order.equipment_id === e.id ? 'selected' : ''}>${esc(e.name)}</option>`
  ).join('');
  const clientSelect = document.getElementById('so-client');
  clientSelect.innerHTML = '<option value="">Selecione</option>' + (state.companies || []).map(c =>
    `<option value="${c.id}" ${order && order.client_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`
  ).join('');
  openModal('modal-so');
}

function editServiceOrder(id) {
  const item = state.orders?.find(o => o.id === id);
  if (item) { loadSODropdowns().then(() => openSOModal(item)); }
}

async function deleteServiceOrder(id) {
  if (!confirm('Excluir esta OS?')) return;
  try { await api('DELETE', `/service-orders/${id}`); toast('Excluída', 'success'); loadServiceOrders(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-so')?.addEventListener('click', () => { loadSODropdowns().then(() => openSOModal(null)); });
document.getElementById('btn-refresh-so')?.addEventListener('click', loadServiceOrders);
document.getElementById('so-filter-status')?.addEventListener('change', loadServiceOrders);
document.getElementById('so-filter-priority')?.addEventListener('change', loadServiceOrders);
document.getElementById('modal-so-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('so-id').value;
  const body = {
    title: document.getElementById('so-title').value,
    description: document.getElementById('so-desc').value,
    equipment_id: document.getElementById('so-equipment').value || null,
    client_id: document.getElementById('so-client').value || null,
    status: document.getElementById('so-status').value,
    priority: document.getElementById('so-priority').value,
    value: parseFloat(document.getElementById('so-value').value) || 0,
    notes: document.getElementById('so-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/service-orders/${id}`, body); toast('Atualizada', 'success'); }
    else { await api('POST', '/service-orders', body); toast('Criada', 'success'); }
    closeModal('modal-so'); loadServiceOrders();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── FASE 3 — CONTRACTS ──────────────────────────────────────────────── */

async function loadContracts() {
  showLoader();
  try {
    const status = document.getElementById('contract-filter-status')?.value;
    let url = '/contracts?page=1&limit=100';
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.contracts = res.contracts || [];
    renderContracts();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderContracts() {
  const tbody = document.getElementById('contracts-tbody');
  const empty = document.getElementById('contracts-empty');
  if (!tbody) return;
  const list = state.contracts || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { active: 'Ativo', ended: 'Encerrado', cancelled: 'Cancelado' };
  const typeMap = { rental: 'Locação', service: 'Serviço' };
  tbody.innerHTML = list.map(c => `
    <tr>
      <td><strong>${esc(c.title)}</strong></td>
      <td>${esc(c.company_name || '—')}</td>
      <td>${esc(c.equipment_name || '—')}</td>
      <td>${typeMap[c.type] || c.type}</td>
      <td style="text-align:right">${c.value ? fmtCurrency(c.value) : '—'}</td>
      <td style="font-size:12px">${c.start_date ? fmtDate(c.start_date) : '—'} — ${c.end_date ? fmtDate(c.end_date) : '—'}</td>
      <td><span class="badge badge-${c.status}">${statusMap[c.status] || c.status}</span></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editContract('${c.id}')" title="Editar">✎</button>
        <button class="btn-icon" onclick="deleteContract('${c.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </td>
    </tr>
  `).join('');
}

async function loadContractDropdowns() {
  try {
    const eq = await api('GET', '/equipment?page=1&limit=500');
    state.equipment = eq.equipment || [];
    const co = await api('GET', '/companies?page=1&limit=500');
    state.companies = co.companies || [];
  } catch {}
}

function openContractModal(contract) {
  document.getElementById('modal-contract-title').textContent = contract ? 'Editar Contrato' : 'Novo Contrato';
  document.getElementById('contract-id').value = contract ? contract.id : '';
  document.getElementById('contract-title').value = contract ? (contract.title || '') : '';
  document.getElementById('contract-type').value = contract ? (contract.type || 'rental') : 'rental';
  document.getElementById('contract-status').value = contract ? (contract.status || 'active') : 'active';
  document.getElementById('contract-start').value = contract ? (contract.start_date ? contract.start_date.substring(0,10) : '') : '';
  document.getElementById('contract-end').value = contract ? (contract.end_date ? contract.end_date.substring(0,10) : '') : '';
  document.getElementById('contract-value').value = contract ? (contract.value || '') : '';
  document.getElementById('contract-notes').value = contract ? (contract.notes || '') : '';

  const coSelect = document.getElementById('contract-company');
  coSelect.innerHTML = '<option value="">Selecione</option>' + (state.companies || []).map(c =>
    `<option value="${c.id}" ${contract && contract.company_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`
  ).join('');
  const eqSelect = document.getElementById('contract-equipment');
  eqSelect.innerHTML = '<option value="">Selecione</option>' + (state.equipment || []).map(e =>
    `<option value="${e.id}" ${contract && contract.equipment_id === e.id ? 'selected' : ''}>${esc(e.name)}</option>`
  ).join('');
  openModal('modal-contract');
}

function editContract(id) {
  const item = state.contracts?.find(c => c.id === id);
  if (item) { loadContractDropdowns().then(() => openContractModal(item)); }
}

async function deleteContract(id) {
  if (!confirm('Excluir este contrato?')) return;
  try { await api('DELETE', `/contracts/${id}`); toast('Excluído', 'success'); loadContracts(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-contract')?.addEventListener('click', () => { loadContractDropdowns().then(() => openContractModal(null)); });
document.getElementById('btn-refresh-contracts')?.addEventListener('click', loadContracts);
document.getElementById('contract-filter-status')?.addEventListener('change', loadContracts);
document.getElementById('modal-contract-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('contract-id').value;
  const body = {
    title: document.getElementById('contract-title').value,
    company_id: document.getElementById('contract-company').value || null,
    equipment_id: document.getElementById('contract-equipment').value || null,
    type: document.getElementById('contract-type').value,
    status: document.getElementById('contract-status').value,
    start_date: document.getElementById('contract-start').value || null,
    end_date: document.getElementById('contract-end').value || null,
    value: parseFloat(document.getElementById('contract-value').value) || 0,
    notes: document.getElementById('contract-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/contracts/${id}`, body); toast('Atualizado', 'success'); }
    else { await api('POST', '/contracts', body); toast('Criado', 'success'); }
    closeModal('modal-contract'); loadContracts();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── FASE 2 — CHARTS ───────────────────────────────────────────────────── */

let chartsInitialized = false;
let chartInstances = {};

function initCharts() {
  if (chartsInitialized) return;
  if (typeof Chart === 'undefined') return;
  chartsInitialized = true;
}

function renderCharts(data) {
  if (typeof Chart === 'undefined') return;

  // Destroy existing charts
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch {} });
  chartInstances = {};

  // Leads by month (bar chart)
  const monthCtx = document.getElementById('chart-leads-month');
  if (monthCtx && data.leads_by_month) {
    chartInstances.leadsMonth = new Chart(monthCtx, {
      type: 'bar',
      data: {
        labels: data.leads_by_month.map(r => r.month),
        datasets: [{
          label: 'Leads',
          data: data.leads_by_month.map(r => r.count),
          backgroundColor: 'rgba(245, 166, 35, 0.6)',
          borderColor: '#f5a623',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  }

  // Pipeline by stage (doughnut)
  const pipeCtx = document.getElementById('chart-pipeline');
  if (pipeCtx && data.deals_by_stage) {
    const stageMap = { prospecting: 'Prospecção', qualification: 'Qualificação', proposal: 'Proposta', negotiation: 'Negociação', won: 'Ganho', lost: 'Perdido' };
    const labels = data.deals_by_stage.map(r => stageMap[r.stage] || r.stage);
    const values = data.deals_by_stage.map(r => r.total_value || r.count);
    const colors = ['#f5a623', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#ef4444'];

    chartInstances.pipeline = new Chart(pipeCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: 'var(--bg-card)',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, boxWidth: 12 } },
        },
      },
    });
  }
}

/* ── FASE 2 — NOTIFICATIONS ────────────────────────────────────────────── */

let notifInterval = null;

async function loadNotifications(unreadOnly = false) {
  try {
    const data = await api('GET', `/notifications${unreadOnly ? '?unread=true' : ''}`);
    state.notifications = Array.isArray(data) ? data : [];
    renderNotifications();
  } catch {}
}

async function loadUnreadCount() {
  try {
    const data = await api('GET', '/notifications/unread-count');
    const badge = document.getElementById('notif-badge');
    if (data.count > 0) {
      badge.textContent = data.count > 99 ? '99+' : data.count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!state.notifications || state.notifications.length === 0) {
    list.innerHTML = '<div class="notif-empty">Nenhuma notificação</div>';
    return;
  }
  list.innerHTML = state.notifications.map(n => `
    <div class="notif-item${n.is_read ? '' : ' unread'}" onclick="navigateToNotif('${n.link || '#'}', ${n.id})">
      <div>${esc(n.message)}</div>
      <div class="notif-time">${fmtDate(n.created_at)}</div>
    </div>
  `).join('');
}

async function navigateToNotif(link, id) {
  try { await api('PATCH', `/notifications/${id}/read`); } catch {}
  loadUnreadCount();
  if (link && link !== '#') navigate(link.replace('/page/', ''));
}

function toggleNotifDropdown() {
  const dd = document.getElementById('notif-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  if (dd.style.display === 'block') loadNotifications();
}

document.getElementById('notification-bell')?.addEventListener('click', toggleNotifDropdown);
document.getElementById('btn-notif-read-all')?.addEventListener('click', async () => {
  try {
    await api('POST', '/notifications/read-all');
    loadNotifications();
    loadUnreadCount();
    toast('Notificações marcadas como lidas', 'success');
  } catch (e) { toast(e.message, 'error'); }
});

// Close notification dropdown on outside click
document.addEventListener('click', (e) => {
  const dd = document.getElementById('notif-dropdown');
  const bell = document.getElementById('notification-bell');
  if (dd && bell && !bell.contains(e.target) && !dd.contains(e.target)) {
    dd.style.display = 'none';
  }
});

/* ── FASE 2 — UPLOAD ──────────────────────────────────────────────────── */

async function uploadFile(entityType, entityId, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append(entityType + '_id', entityId);
  formData.append('file', file);

  const headers = {};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  // Note: Don't set Content-Type for multipart — fetch sets it automatically with boundary

  showLoader();
  try {
    const res = await fetch('/api/upload?' + entityType + '_id=' + entityId, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    toast('Arquivo enviado!', 'success');
    loadFiles(entityType, entityId);
  } catch (e) { toast(e.message, 'error'); }
  finally {
    hideLoader();
    fileInput.value = '';
  }
}

async function loadFiles(entityType, entityId) {
  const list = document.getElementById(`${entityType}-files-list`);
  if (!list) return;

  try {
    const files = await api('GET', `/files?${entityType}_id=${entityId}`);
    if (files.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:4px 0">Nenhum arquivo</div>';
      return;
    }
    list.innerHTML = files.map(f => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light)">
        <span style="font-size:13px">${esc(f.original_name)}</span>
        <div style="display:flex;gap:8px">
          <a href="/api/files/${f.id}/download" class="btn-link" style="font-size:12px" target="_blank" download>⬇</a>
          <button class="btn-link" style="font-size:12px;color:var(--red)" onclick="deleteFile(${f.id},'${entityType}',${entityId})">✕</button>
        </div>
      </div>
    `).join('');
  } catch {}
}

async function deleteFile(id, entityType, entityId) {
  try {
    await api('DELETE', `/files/${id}`);
    toast('Arquivo excluído', 'success');
    loadFiles(entityType, entityId);
  } catch (e) { toast(e.message, 'error'); }
}

/* ── FASE 2 — EXPORT ──────────────────────────────────────────────────── */

function exportCsv(endpoint) {
  const token = state.token;
  const url = `${API}${endpoint}`;
  // Create a temporary link to trigger download with auth header
  fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    })
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = endpoint.replace(/\//g, '_') + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Exportado com sucesso!', 'success');
    })
    .catch(e => toast(e.message, 'error'));
}

/* ── FASE 2 — LOAD DASHBOARD CHARTS ───────────────────────────────────── */

// Augment loadDashboard to also load charts
const _origLoadDashboard = loadDashboard;
loadDashboard = async function() {
  await _origLoadDashboard.call(this);
  // Load charts data
  try {
    initCharts();
    const chartsData = await api('GET', '/dashboard/charts');
    renderCharts(chartsData);
  } catch {}
  // Load unread notifications
  loadUnreadCount();
};

/* ── FASE 2 — EXPORT BUTTONS ─────────────────────────────────────────--- */

// Add export buttons to page headers after navigation
function addExportButtons(page) {
  const header = document.querySelector(`#page-${page} .page-header`);
  if (!header) return;
  const exportMap = {
    leads: '/leads/export',
    companies: '/companies/export',
    deals: '/deals/export',
  };
  if (!exportMap[page]) return;
  // Avoid duplicate
  if (header.querySelector('.btn-export')) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary btn-export';
  btn.textContent = '📥 CSV';
  btn.style.marginLeft = '8px';
  btn.onclick = () => exportCsv(exportMap[page]);
  const actionGroup = header.querySelector('div:last-child') || header.lastElementChild;
  if (actionGroup && actionGroup.tagName === 'DIV') {
    actionGroup.appendChild(btn);
  }
}

/* ── FASE 4 — GLOBAL SEARCH ─────────────────────────────────────────── */

let searchTimeout;

document.getElementById('global-search')?.addEventListener('input', function() {
  clearTimeout(searchTimeout);
  const q = this.value.trim();
  const resultsEl = document.getElementById('search-results');
  if (q.length < 2) { resultsEl.style.display = 'none'; return; }
  searchTimeout = setTimeout(async () => {
    try {
      const res = await api('GET', `/search?q=${encodeURIComponent(q)}`);
      const items = res.results || [];
      if (items.length === 0) {
        resultsEl.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px">Nenhum resultado</div>';
      } else {
        const typeLabel = { lead: 'Lead', company: 'Empresa', equipment: 'Equipamento', service_order: 'OS', contract: 'Contrato' };
        resultsEl.innerHTML = items.map(item => `
          <div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-light);font-size:13px;display:flex;justify-content:space-between;align-items:center"
               onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''"
               onclick="navigate('${item.type === 'service_order' ? 'service-orders' : item.type === 'contract' ? 'contracts' : item.type}s');document.getElementById('search-results').style.display='none';document.getElementById('global-search').value=''">
            <span><strong>${esc(item.label)}</strong> <span style="color:var(--text-muted);font-size:11px">${esc(item.extra || '')}</span></span>
            <span style="font-size:10px;background:var(--bg-surface);padding:2px 6px;border-radius:4px">${typeLabel[item.type] || item.type}</span>
          </div>
        `).join('');
      }
      resultsEl.style.display = 'block';
    } catch { document.getElementById('search-results').style.display = 'none'; }
  }, 300);
});

document.addEventListener('click', (e) => {
  const el = document.getElementById('search-results');
  if (el && !e.target.closest('.sidebar-search')) el.style.display = 'none';
});

/* ── FASE 4 — CALENDAR ────────────────────────────────────────────── */

let calendarMonth = new Date().getMonth() + 1;
let calendarYear = new Date().getFullYear();

async function loadCalendar() {
  showLoader();
  try {
    const res = await api('GET', `/calendar?month=${calendarMonth}&year=${calendarYear}`);
    renderCalendar(res.events || []);
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderCalendar(events) {
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  document.getElementById('calendar-month-label').textContent = `${monthNames[calendarMonth - 1]} ${calendarYear}`;

  const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Group events by date
  const byDate = {};
  for (const ev of events) {
    const d = (ev.start_date || '').substring(0, 10);
    if (d) {
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(ev);
    }
  }

  const typeIcon = { service_order: '🔧', contract: '📄', task: '☐' };
  const statusColor = { open: '#f59e0b', in_progress: '#3b82f6', closed: '#10b981', cancelled: '#ef4444', active: '#10b981', ended: '#6b7280', pending: '#f59e0b', done: '#10b981' };

  let cells = '';
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) cells += '<td style="border:1px solid var(--border-color);vertical-align:top;height:90px;width:14.28%;background:var(--bg-surface)"></td>';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const dayEvents = byDate[dateStr] || [];

    cells += `<td style="border:1px solid var(--border-color);vertical-align:top;height:90px;width:14.28%;padding:4px;${isToday ? 'background:var(--bg-hover)' : ''}">
      <div style="font-size:12px;font-weight:${isToday ? '700' : '400'};margin-bottom:4px;${isToday ? 'color:var(--accent)' : ''}">${day}</div>`;

    for (const ev of dayEvents.slice(0, 3)) {
      cells += `<div style="font-size:10px;padding:1px 4px;margin-bottom:1px;border-radius:3px;background:${statusColor[ev.status] || '#6b7280'}20;color:${statusColor[ev.status] || '#6b7280'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(ev.title)}">
        ${typeIcon[ev.type] || '•'} ${esc(ev.title.substring(0, 20))}
      </div>`;
    }
    if (dayEvents.length > 3) {
      cells += `<div style="font-size:9px;color:var(--text-muted)">+${dayEvents.length - 3} mais</div>`;
    }
    cells += '</td>';

    if ((firstDay + day) % 7 === 0) cells += '</tr><tr>';
  }

  // Fill remaining cells
  const total = firstDay + daysInMonth;
  const remaining = (7 - (total % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    cells += '<td style="border:1px solid var(--border-color);vertical-align:top;height:90px;width:14.28%;background:var(--bg-surface)"></td>';
  }

  document.getElementById('calendar-tbody').innerHTML = `<tr>${cells}</tr>`;

  // Legend
  const legendEl = document.getElementById('calendar-legend');
  const counts = { service_order: 0, contract: 0, task: 0 };
  for (const ev of events) { if (counts[ev.type] !== undefined) counts[ev.type]++; }
  legendEl.innerHTML = Object.entries(counts).filter(([_,c]) => c > 0)
    .map(([t,c]) => `<span>${typeIcon[t]} ${t === 'service_order' ? 'OS' : t === 'contract' ? 'Contratos' : 'Tarefas'}: ${c}</span>`).join('');
}

document.getElementById('btn-cal-prev')?.addEventListener('click', () => { calendarMonth--; if (calendarMonth < 1) { calendarMonth = 12; calendarYear--; } loadCalendar(); });
document.getElementById('btn-cal-next')?.addEventListener('click', () => { calendarMonth++; if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; } loadCalendar(); });
document.getElementById('btn-cal-today')?.addEventListener('click', () => { const d = new Date(); calendarMonth = d.getMonth() + 1; calendarYear = d.getFullYear(); loadCalendar(); });

/* ── NOVOS MÓDULOS: BI ──────────────────────────────────────────────── */

async function loadBI() {
  showLoader();
  try {
    const kpis = await api('GET', '/bi/kpis');
    document.getElementById('bi-conversion').textContent = kpis.conversionRate != null ? kpis.conversionRate + '%' : '—';
    document.getElementById('bi-avg-ticket').textContent = kpis.avgTicket != null ? fmtCurrency(kpis.avgTicket) : '—';
    document.getElementById('bi-fleet').textContent = kpis.fleetUtilization != null ? kpis.fleetUtilization + '%' : '—';
    document.getElementById('bi-recurrence').textContent = kpis.recurrenceRate != null ? kpis.recurrenceRate + '%' : '—';
  } catch {}
  try { renderBICharts(); } catch {}
  try {
    const top = await api('GET', '/bi/top-clients');
    const tb = document.getElementById('bi-top-clients-tbody');
    if (tb) tb.innerHTML = (top.clients || top || []).map(c => `<tr><td><strong>${esc(c.name)}</strong></td><td style="text-align:right">${c.deal_count}</td><td style="text-align:right">${fmtCurrency(c.total_value)}</td></tr>`).join('');
  } catch {}
  finally { hideLoader(); }
}

async function renderBICharts() {
  if (typeof Chart === 'undefined') return;
  try {
    const source = await api('GET', '/bi/leads-by-source');
    const srcEl = document.getElementById('chart-bi-source');
    if (srcEl && source && source.length > 0) {
      new Chart(srcEl, { type: 'doughnut', data: { labels: source.map(r => r.source || 'Desconhecido'), datasets: [{ data: source.map(r => r.count), backgroundColor: ['#f5a623','#3b82f6','#10b981','#8b5cf6','#ef4444','#ec4899'], borderWidth: 2, borderColor: 'var(--bg-card)' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 8, boxWidth: 10, font: { size: 11 } } } } } });
    }
  } catch {}
  try {
    const deals = await api('GET', '/bi/deals-by-month');
    const dlEl = document.getElementById('chart-bi-deals');
    if (dlEl && deals && deals.length > 0) {
      new Chart(dlEl, { type: 'bar', data: { labels: deals.map(r => r.month), datasets: [{ label: 'Negócios', data: deals.map(r => r.count), backgroundColor: 'rgba(59, 130, 246, 0.6)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } });
    }
  } catch {}
}

document.getElementById('btn-refresh-bi')?.addEventListener('click', loadBI);

/* ── NOVOS MÓDULOS: INVOICES ────────────────────────────────────────── */

let invoicesPage = 1;
async function loadInvoices(page) {
  if (page) invoicesPage = page;
  showLoader();
  try {
    const status = document.getElementById('invoice-filter-status')?.value || '';
    let url = `/invoices?page=${invoicesPage}&limit=10`;
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.invoices = res.invoices || [];
    // Summary stats
    try {
      const summary = await api('GET', '/invoices/summary');
      if (summary) {
        document.getElementById('inv-received').textContent = fmtCurrency(summary.paid || 0);
        document.getElementById('inv-pending').textContent = fmtCurrency(summary.pending || 0);
        document.getElementById('inv-overdue').textContent = fmtCurrency(summary.overdue || 0);
        document.getElementById('inv-total').textContent = fmtCurrency(summary.total || 0);
      }
    } catch {}
    renderInvoices();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderInvoices() {
  const tbody = document.getElementById('invoices-tbody');
  const empty = document.getElementById('invoices-empty');
  const paginationEl = document.getElementById('invoices-pagination');
  const list = state.invoices || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (paginationEl) paginationEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { pending: 'Pendente', paid: 'Pago', overdue: 'Vencido', cancelled: 'Cancelado' };
  tbody.innerHTML = list.map(i => `<tr>
    <td>${esc(i.nf_number || '—')}</td>
    <td>${esc(i.company_name || '—')}</td>
    <td>${esc(i.description || '—')}</td>
    <td style="text-align:right">${fmtCurrency(i.value)}</td>
    <td>${i.due_date ? fmtDate(i.due_date) : '—'}</td>
    <td><span class="badge badge-${i.status}">${statusMap[i.status] || i.status}</span></td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="editInvoice('${i.id}')" title="Editar">✎</button>
      <button class="btn-icon" onclick="deleteInvoice('${i.id}')" title="Excluir" style="color:var(--red)">✕</button>
    </td></tr>`).join('');
}

async function loadInvoiceCompanies() {
  try {
    const co = await api('GET', '/companies?page=1&limit=500');
    const sel = document.getElementById('invoice-company');
    if (sel) sel.innerHTML = '<option value="">Selecione</option>' + (co.companies || co || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  } catch {}
}

function openInvoiceModal(inv) {
  document.getElementById('modal-invoice-title').textContent = inv ? 'Editar Fatura' : 'Nova Fatura';
  document.getElementById('invoice-id').value = inv ? inv.id : '';
  document.getElementById('invoice-description').value = inv ? (inv.description || '') : '';
  document.getElementById('invoice-value').value = inv ? (inv.value || '') : '';
  document.getElementById('invoice-due').value = inv ? (inv.due_date ? inv.due_date.substring(0,10) : '') : '';
  document.getElementById('invoice-status').value = inv ? (inv.status || 'pending') : 'pending';
  document.getElementById('invoice-notes').value = inv ? (inv.notes || '') : '';
  if (!inv) loadInvoiceCompanies();
  openModal('modal-invoice');
}

function editInvoice(id) {
  const inv = state.invoices?.find(i => i.id === id);
  if (inv) { loadInvoiceCompanies().then(() => openInvoiceModal(inv)); }
}

async function deleteInvoice(id) {
  if (!confirm('Excluir esta fatura?')) return;
  try { await api('DELETE', `/invoices/${id}`); toast('Excluída', 'success'); loadInvoices(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-invoice')?.addEventListener('click', () => { loadInvoiceCompanies().then(() => openInvoiceModal(null)); });
document.getElementById('btn-refresh-invoices')?.addEventListener('click', loadInvoices);
document.getElementById('invoice-filter-status')?.addEventListener('change', loadInvoices);
document.getElementById('modal-invoice-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('invoice-id').value;
  const body = {
    company_id: document.getElementById('invoice-company').value || null,
    description: document.getElementById('invoice-description').value,
    value: parseFloat(document.getElementById('invoice-value').value) || 0,
    due_date: document.getElementById('invoice-due').value || null,
    status: document.getElementById('invoice-status').value,
    notes: document.getElementById('invoice-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/invoices/${id}`, body); toast('Atualizada', 'success'); }
    else { await api('POST', '/invoices', body); toast('Criada', 'success'); }
    closeModal('modal-invoice'); loadInvoices();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── NOVOS MÓDULOS: PROPOSALS ───────────────────────────────────────── */

let proposalsPage = 1;
async function loadProposals(page) {
  if (page) proposalsPage = page;
  showLoader();
  try {
    const status = document.getElementById('proposal-filter-status')?.value || '';
    let url = `/proposals?page=${proposalsPage}&limit=10`;
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.proposals = res.proposals || [];
    renderProposals();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderProposals() {
  const tbody = document.getElementById('proposals-tbody');
  const empty = document.getElementById('proposals-empty');
  const pagEl = document.getElementById('proposals-pagination');
  const list = state.proposals || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (pagEl) pagEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { draft: 'Rascunho', sent: 'Enviada', approved: 'Aprovada', rejected: 'Rejeitada' };
  tbody.innerHTML = list.map(p => `<tr>
    <td><strong>${esc(p.title)}</strong></td>
    <td>${esc(p.company_name || '—')}</td>
    <td>${esc(p.contact_name || '—')}</td>
    <td style="text-align:right">${fmtCurrency(p.value)}</td>
    <td>${p.valid_until ? fmtDate(p.valid_until) : '—'}</td>
    <td><span class="badge badge-${p.status}">${statusMap[p.status] || p.status}</span></td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="editProposal('${p.id}')" title="Editar">✎</button>
      <button class="btn-icon" onclick="deleteProposal('${p.id}')" title="Excluir" style="color:var(--red)">✕</button>
    </td></tr>`).join('');
}

async function loadProposalCompanies() {
  try {
    const co = await api('GET', '/companies?page=1&limit=500');
    const sel = document.getElementById('proposal-company');
    if (sel) sel.innerHTML = '<option value="">Selecione</option>' + (co.companies || co || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  } catch {}
}

function openProposalModal(proposal) {
  document.getElementById('modal-proposal-title').textContent = proposal ? 'Editar Proposta' : 'Nova Proposta';
  document.getElementById('proposal-id').value = proposal ? proposal.id : '';
  document.getElementById('proposal-title').value = proposal ? (proposal.title || '') : '';
  document.getElementById('proposal-contact').value = proposal ? (proposal.contact_name || '') : '';
  document.getElementById('proposal-valid').value = proposal ? (proposal.valid_until ? proposal.valid_until.substring(0,10) : '') : '';
  document.getElementById('proposal-notes').value = proposal ? (proposal.notes || '') : '';
  if (!proposal) loadProposalCompanies();
  openModal('modal-proposal');
}

function editProposal(id) {
  const p = state.proposals?.find(p => p.id === id);
  if (p) { loadProposalCompanies().then(() => openProposalModal(p)); }
}

async function deleteProposal(id) {
  if (!confirm('Excluir esta proposta?')) return;
  try { await api('DELETE', `/proposals/${id}`); toast('Excluída', 'success'); loadProposals(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-proposal')?.addEventListener('click', () => { loadProposalCompanies().then(() => openProposalModal(null)); });
document.getElementById('btn-refresh-proposals')?.addEventListener('click', loadProposals);
document.getElementById('proposal-filter-status')?.addEventListener('change', loadProposals);
document.getElementById('modal-proposal-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('proposal-id').value;
  const items = Array.from(document.querySelectorAll('.proposal-item-row')).map(row => {
    const inputs = row.querySelectorAll('input');
    return { description: inputs[0].value, quantity: parseFloat(inputs[1].value) || 1, unit_price: parseFloat(inputs[2].value) || 0 };
  }).filter(i => i.description);
  const body = {
    title: document.getElementById('proposal-title').value,
    company_id: document.getElementById('proposal-company').value || null,
    contact_name: document.getElementById('proposal-contact').value,
    valid_until: document.getElementById('proposal-valid').value || null,
    items,
    notes: document.getElementById('proposal-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/proposals/${id}`, body); toast('Atualizada', 'success'); }
    else { await api('POST', '/proposals', body); toast('Criada', 'success'); }
    closeModal('modal-proposal'); loadProposals();
  } catch (e) { toast(e.message, 'error'); }
});

document.getElementById('btn-proposal-add-item')?.addEventListener('click', () => {
  const container = document.getElementById('proposal-items-container');
  const row = document.createElement('div');
  row.className = 'proposal-item-row';
  row.style.cssText = 'display:flex;gap:6px';
  row.innerHTML = '<input type="text" placeholder="Descrição" style="flex:3;padding:6px 8px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-color);font-size:12px"><input type="number" placeholder="Qtd" style="width:60px;padding:6px 8px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-color);font-size:12px" min="1" value="1"><input type="number" placeholder="Valor" style="width:100px;padding:6px 8px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-color);font-size:12px" step="0.01" min="0"><button type="button" class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="this.parentElement.remove()">✕</button>';
  container.appendChild(row);
});

/* ── NOVOS MÓDULOS: PROJECTS ────────────────────────────────────────── */

let projectsPage = 1;
async function loadProjects(page) {
  if (page) projectsPage = page;
  showLoader();
  try {
    const status = document.getElementById('project-filter-status')?.value || '';
    let url = `/projects?page=${projectsPage}&limit=10`;
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.projects = res.projects || [];
    renderProjects();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderProjects() {
  const tbody = document.getElementById('projects-tbody');
  const empty = document.getElementById('projects-empty');
  const pagEl = document.getElementById('projects-pagination');
  const list = state.projects || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (pagEl) pagEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { planning: 'Planejamento', in_progress: 'Em Andamento', completed: 'Concluído', cancelled: 'Cancelado' };
  tbody.innerHTML = list.map(p => `<tr>
    <td><strong>${esc(p.name)}</strong></td>
    <td>${esc(p.company_name || '—')}</td>
    <td><span class="badge badge-${p.status}">${statusMap[p.status] || p.status}</span></td>
    <td style="text-align:right">${fmtCurrency(p.value)}</td>
    <td>${p.start_date ? fmtDate(p.start_date) : '—'}</td>
    <td>${p.end_date ? fmtDate(p.end_date) : '—'}</td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="editProject('${p.id}')" title="Editar">✎</button>
      <button class="btn-icon" onclick="deleteProject('${p.id}')" title="Excluir" style="color:var(--red)">✕</button>
    </td></tr>`).join('');
}

async function loadProjectCompanies() {
  try {
    const co = await api('GET', '/companies?page=1&limit=500');
    const sel = document.getElementById('project-company');
    if (sel) sel.innerHTML = '<option value="">Selecione</option>' + (co.companies || co || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  } catch {}
}

function openProjectModal(project) {
  document.getElementById('modal-project-title').textContent = project ? 'Editar Obra' : 'Nova Obra';
  document.getElementById('project-id').value = project ? project.id : '';
  document.getElementById('project-name').value = project ? (project.name || '') : '';
  document.getElementById('project-desc').value = project ? (project.description || '') : '';
  document.getElementById('project-start').value = project ? (project.start_date ? project.start_date.substring(0,10) : '') : '';
  document.getElementById('project-end').value = project ? (project.end_date ? project.end_date.substring(0,10) : '') : '';
  document.getElementById('project-value').value = project ? (project.value || '') : '';
  document.getElementById('project-notes').value = project ? (project.notes || '') : '';
  if (!project) loadProjectCompanies();
  openModal('modal-project');
}

function editProject(id) {
  const p = state.projects?.find(p => p.id === id);
  if (p) { loadProjectCompanies().then(() => openProjectModal(p)); }
}

async function deleteProject(id) {
  if (!confirm('Excluir esta obra?')) return;
  try { await api('DELETE', `/projects/${id}`); toast('Excluída', 'success'); loadProjects(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-project')?.addEventListener('click', () => { loadProjectCompanies().then(() => openProjectModal(null)); });
document.getElementById('btn-refresh-projects')?.addEventListener('click', loadProjects);
document.getElementById('project-filter-status')?.addEventListener('change', loadProjects);
document.getElementById('modal-project-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('project-id').value;
  const body = {
    name: document.getElementById('project-name').value,
    company_id: document.getElementById('project-company').value || null,
    description: document.getElementById('project-desc').value,
    start_date: document.getElementById('project-start').value || null,
    end_date: document.getElementById('project-end').value || null,
    value: parseFloat(document.getElementById('project-value').value) || 0,
    notes: document.getElementById('project-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/projects/${id}`, body); toast('Atualizada', 'success'); }
    else { await api('POST', '/projects', body); toast('Criada', 'success'); }
    closeModal('modal-project'); loadProjects();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── NOVOS MÓDULOS: TICKETS ─────────────────────────────────────────── */

let ticketsPage = 1;
async function loadTickets(page) {
  if (page) ticketsPage = page;
  showLoader();
  try {
    const status = document.getElementById('ticket-filter-status')?.value || '';
    const priority = document.getElementById('ticket-filter-priority')?.value || '';
    let url = `/tickets?page=${ticketsPage}&limit=10`;
    if (status) url += '&status=' + status;
    if (priority) url += '&priority=' + priority;
    const res = await api('GET', url);
    state.tickets = res.tickets || [];
    renderTickets();
    loadTicketSLA();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

async function loadTicketSLA() {
  try {
    const sla = await api('GET', '/tickets/sla/stats');
    const el = document.getElementById('ticket-sla-stats');
    if (el) el.innerHTML = `<div class="stat-card green" style="flex:1"><div class="stat-label">Dentro do SLA</div><div class="stat-value">${sla.withinSla}</div><div class="stat-sub">${sla.rate}%</div></div><div class="stat-card red" style="flex:1"><div class="stat-label">Violados</div><div class="stat-value">${sla.breached}</div></div>`;
  } catch {}
}

function renderTickets() {
  const tbody = document.getElementById('tickets-tbody');
  const empty = document.getElementById('tickets-empty');
  const pagEl = document.getElementById('tickets-pagination');
  const list = state.tickets || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (pagEl) pagEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { open: 'Aberto', in_progress: 'Em Andamento', resolved: 'Resolvido', closed: 'Fechado' };
  const priorityMap = { high: 'Alta', medium: 'Média', low: 'Baixa', critical: 'Crítica' };
  document.getElementById('ticket-count-badge').textContent = list.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
  tbody.innerHTML = list.map(t => {
    const slaOk = t.sla_deadline ? new Date(t.sla_deadline) > new Date() : true;
    return `<tr>
      <td>#${t.id}</td>
      <td><strong>${esc(t.title)}</strong></td>
      <td>${esc(t.company_name || '—')}</td>
      <td>${esc(t.category || '—')}</td>
      <td><span class="badge badge-${t.priority}">${priorityMap[t.priority] || t.priority}</span></td>
      <td><span class="badge badge-${t.status}">${statusMap[t.status] || t.status}</span></td>
      <td><span style="color:${slaOk ? 'var(--green)' : 'var(--red)'};font-size:12px">${slaOk ? '✓' : '✗'} ${t.sla_deadline ? fmtDate(t.sla_deadline) : '—'}</span></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editTicket('${t.id}')" title="Editar">✎</button>
        <button class="btn-icon" onclick="deleteTicket('${t.id}')" title="Excluir" style="color:var(--red)">✕</button>
      </td></tr>`;
  }).join('');
}

async function loadTicketCompanies() {
  try {
    const co = await api('GET', '/companies?page=1&limit=500');
    const sel = document.getElementById('ticket-company');
    if (sel) sel.innerHTML = '<option value="">Selecione</option>' + (co.companies || co || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  } catch {}
}

function openTicketModal(ticket) {
  document.getElementById('modal-ticket-title').textContent = ticket ? 'Editar Chamado' : 'Novo Chamado';
  document.getElementById('ticket-id').value = ticket ? ticket.id : '';
  document.getElementById('ticket-title').value = ticket ? (ticket.title || '') : '';
  document.getElementById('ticket-desc').value = ticket ? (ticket.description || '') : '';
  document.getElementById('ticket-contact').value = ticket ? (ticket.contact_name || '') : '';
  document.getElementById('ticket-category').value = ticket ? (ticket.category || 'support') : 'support';
  document.getElementById('ticket-priority').value = ticket ? (ticket.priority || 'medium') : 'medium';
  document.getElementById('ticket-level').value = ticket ? (ticket.level || '1') : '1';
  document.getElementById('ticket-notes').value = ticket ? (ticket.notes || '') : '';
  if (!ticket) loadTicketCompanies();
  openModal('modal-ticket');
}

function editTicket(id) {
  const t = state.tickets?.find(t => t.id === id);
  if (t) { loadTicketCompanies().then(() => openTicketModal(t)); }
}

async function deleteTicket(id) {
  if (!confirm('Excluir este chamado?')) return;
  try { await api('DELETE', `/tickets/${id}`); toast('Excluído', 'success'); loadTickets(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-ticket')?.addEventListener('click', () => { loadTicketCompanies().then(() => openTicketModal(null)); });
document.getElementById('btn-refresh-tickets')?.addEventListener('click', loadTickets);
document.getElementById('ticket-filter-status')?.addEventListener('change', loadTickets);
document.getElementById('ticket-filter-priority')?.addEventListener('change', loadTickets);
document.getElementById('modal-ticket-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('ticket-id').value;
  const body = {
    title: document.getElementById('ticket-title').value,
    description: document.getElementById('ticket-desc').value,
    company_id: document.getElementById('ticket-company').value || null,
    contact_name: document.getElementById('ticket-contact').value,
    category: document.getElementById('ticket-category').value,
    priority: document.getElementById('ticket-priority').value,
    level: parseInt(document.getElementById('ticket-level').value) || 1,
    notes: document.getElementById('ticket-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/tickets/${id}`, body); toast('Atualizado', 'success'); }
    else { await api('POST', '/tickets', body); toast('Criado', 'success'); }
    closeModal('modal-ticket'); loadTickets();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── NOVOS MÓDULOS: RENTAL ──────────────────────────────────────────── */

async function loadRental() {
  showLoader();
  try {
    const util = await api('GET', '/rental/utilization');
    if (util) {
      document.getElementById('rental-available').textContent = util.available ?? '—';
      document.getElementById('rental-in-use').textContent = util.inUse ?? '—';
      document.getElementById('rental-mtce').textContent = util.maintenance ?? '—';
      document.getElementById('rental-util').textContent = (util.utilization != null ? util.utilization + '%' : '—');
    }
  } catch {}
  try {
    const avail = await api('GET', '/rental/availability');
    const tb = document.getElementById('rental-tbody');
    if (tb) tb.innerHTML = (avail || []).map(a => `<tr><td>${esc(a.equipment_name || '—')}</td><td>${a.start_date || '—'}</td><td>${a.end_date || '—'}</td><td><span class="badge badge-${a.status}">${esc(a.status)}</span></td><td style="text-align:right"><button class="btn-icon" onclick="deleteRentalBlock(${a.id})" title="Excluir" style="color:var(--red)">✕</button></td></tr>`).join('');
  } catch {}
  try {
    const exp = await api('GET', '/rental/expiring?days=15');
    const tb2 = document.getElementById('rental-expiring-tbody');
    if (tb2) tb2.innerHTML = (exp || []).map(c => `<tr><td>${esc(c.title)}</td><td>${esc(c.equipment_name || '—')}</td><td>${esc(c.company_name || '—')}</td><td>${c.end_date || '—'}</td></tr>`).join('');
  } catch {}
  finally { hideLoader(); }
}

async function deleteRentalBlock(id) {
  if (!confirm('Excluir este bloqueio?')) return;
  try { await api('DELETE', `/rental/availability/${id}`); toast('Excluído', 'success'); loadRental(); } catch (e) { toast(e.message, 'error'); }
}

async function loadRentalDropdowns() {
  try {
    const eq = await api('GET', '/equipment?page=1&limit=500');
    const sel = document.getElementById('rental-equipment');
    if (sel) sel.innerHTML = '<option value="">Selecione</option>' + (eq.equipment || []).map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('');
    const co = await api('GET', '/contracts?page=1&limit=500');
    const sel2 = document.getElementById('rental-contract');
    if (sel2) sel2.innerHTML = '<option value="">Nenhum</option>' + (co.contracts || []).map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
  } catch {}
}

document.getElementById('btn-new-rental-block')?.addEventListener('click', () => { loadRentalDropdowns().then(() => openModal('modal-rental')); });
document.getElementById('btn-refresh-rental')?.addEventListener('click', loadRental);
document.getElementById('modal-rental-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    equipment_id: document.getElementById('rental-equipment').value,
    start_date: document.getElementById('rental-start').value,
    end_date: document.getElementById('rental-end').value,
    status: document.getElementById('rental-block-status').value,
    contract_id: document.getElementById('rental-contract').value || null,
    notes: document.getElementById('rental-notes').value,
  };
  try {
    await api('POST', '/rental/availability', body);
    toast('Datas bloqueadas', 'success');
    closeModal('modal-rental'); loadRental();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── NOVOS MÓDULOS: CAMPAIGNS ───────────────────────────────────────── */

let campaignsPage = 1;
async function loadCampaigns(page) {
  if (page) campaignsPage = page;
  showLoader();
  try {
    const status = document.getElementById('campaign-filter-status')?.value || '';
    let url = `/campaigns?page=${campaignsPage}&limit=10`;
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.campaigns = res.campaigns || [];
    renderCampaigns();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderCampaigns() {
  const tbody = document.getElementById('campaigns-tbody');
  const empty = document.getElementById('campaigns-empty');
  const pagEl = document.getElementById('campaigns-pagination');
  const list = state.campaigns || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (pagEl) pagEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { draft: 'Rascunho', active: 'Ativa', paused: 'Pausada', finished: 'Concluída' };
  tbody.innerHTML = list.map(c => `<tr>
    <td><strong>${esc(c.name)}</strong></td>
    <td>${esc(c.type || '—')}</td>
    <td><span class="badge badge-${c.status}">${statusMap[c.status] || c.status}</span></td>
    <td>${c.start_date ? fmtDate(c.start_date) : '—'}</td>
    <td>${c.end_date ? fmtDate(c.end_date) : '—'}</td>
    <td style="text-align:right">${fmtCurrency(c.budget)}</td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="editCampaign('${c.id}')" title="Editar">✎</button>
      <button class="btn-icon" onclick="deleteCampaign('${c.id}')" title="Excluir" style="color:var(--red)">✕</button>
    </td></tr>`).join('');
}

function openCampaignModal(campaign) {
  document.getElementById('modal-campaign-title').textContent = campaign ? 'Editar Campanha' : 'Nova Campanha';
  document.getElementById('campaign-id').value = campaign ? campaign.id : '';
  document.getElementById('campaign-name').value = campaign ? (campaign.name || '') : '';
  document.getElementById('campaign-type').value = campaign ? (campaign.type || 'email') : 'email';
  document.getElementById('campaign-desc').value = campaign ? (campaign.description || '') : '';
  document.getElementById('campaign-start').value = campaign ? (campaign.start_date ? campaign.start_date.substring(0,10) : '') : '';
  document.getElementById('campaign-end').value = campaign ? (campaign.end_date ? campaign.end_date.substring(0,10) : '') : '';
  document.getElementById('campaign-budget').value = campaign ? (campaign.budget || '') : '';
  document.getElementById('campaign-notes').value = campaign ? (campaign.notes || '') : '';
  openModal('modal-campaign');
}

function editCampaign(id) {
  const c = state.campaigns?.find(c => c.id === id);
  if (c) openCampaignModal(c);
}

async function deleteCampaign(id) {
  if (!confirm('Excluir esta campanha?')) return;
  try { await api('DELETE', `/campaigns/${id}`); toast('Excluída', 'success'); loadCampaigns(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-campaign')?.addEventListener('click', () => openCampaignModal(null));
document.getElementById('btn-refresh-campaigns')?.addEventListener('click', loadCampaigns);
document.getElementById('campaign-filter-status')?.addEventListener('change', loadCampaigns);
document.getElementById('modal-campaign-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('campaign-id').value;
  const body = {
    name: document.getElementById('campaign-name').value,
    type: document.getElementById('campaign-type').value,
    description: document.getElementById('campaign-desc').value,
    start_date: document.getElementById('campaign-start').value || null,
    end_date: document.getElementById('campaign-end').value || null,
    budget: parseFloat(document.getElementById('campaign-budget').value) || 0,
    notes: document.getElementById('campaign-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/campaigns/${id}`, body); toast('Atualizada', 'success'); }
    else { await api('POST', '/campaigns', body); toast('Criada', 'success'); }
    closeModal('modal-campaign'); loadCampaigns();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── NOVOS MÓDULOS: FOLLOWUPS ───────────────────────────────────────── */

let followupsPage = 1;
async function loadFollowups(page) {
  if (page) followupsPage = page;
  showLoader();
  try {
    const status = document.getElementById('followup-filter-status')?.value || '';
    let url = `/followups?page=${followupsPage}&limit=10`;
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.followups = res.followups || [];
    renderFollowups();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderFollowups() {
  const tbody = document.getElementById('followups-tbody');
  const empty = document.getElementById('followups-empty');
  const pagEl = document.getElementById('followups-pagination');
  const list = state.followups || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (pagEl) pagEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const actionMap = { call: 'Ligação', email: 'Email', visit: 'Visita', whatsapp: 'WhatsApp', meeting: 'Reunião' };
  const priorityMap = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  tbody.innerHTML = list.map(f => `<tr>
    <td><strong>${esc(f.lead_name || '—')}</strong></td>
    <td>${actionMap[f.action] || f.action}</td>
    <td>${esc((f.description || '').substring(0, 40))}</td>
    <td>${f.due_date ? fmtDate(f.due_date) : '—'}</td>
    <td><span class="badge badge-${f.priority}">${priorityMap[f.priority] || f.priority}</span></td>
    <td><span class="badge badge-${f.status}">${f.status === 'pending' ? 'Pendente' : f.status === 'completed' ? 'Concluído' : f.status}</span></td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="completeFollowup('${f.id}')" title="Concluir" style="color:var(--green)">✓</button>
      <button class="btn-icon" onclick="editFollowup('${f.id}')" title="Editar">✎</button>
      <button class="btn-icon" onclick="deleteFollowup('${f.id}')" title="Excluir" style="color:var(--red)">✕</button>
    </td></tr>`).join('');
}

async function loadFollowupLeads() {
  try {
    const leads = await api('GET', '/leads?page=1&limit=500');
    const sel = document.getElementById('followup-lead');
    if (sel) sel.innerHTML = '<option value="">Selecione</option>' + (leads.leads || leads || []).map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
  } catch {}
}

function openFollowupModal(followup) {
  document.getElementById('modal-followup-title').textContent = followup ? 'Editar Acompanhamento' : 'Novo Acompanhamento';
  document.getElementById('followup-id').value = followup ? followup.id : '';
  document.getElementById('followup-desc').value = followup ? (followup.description || '') : '';
  document.getElementById('followup-due').value = followup ? (followup.due_date ? followup.due_date.substring(0,10) : '') : '';
  document.getElementById('followup-action').value = followup ? (followup.action || 'call') : 'call';
  document.getElementById('followup-priority').value = followup ? (followup.priority || 'medium') : 'medium';
  document.getElementById('followup-notes').value = followup ? (followup.notes || '') : '';
  if (!followup) loadFollowupLeads();
  openModal('modal-followup');
}

function editFollowup(id) {
  const f = state.followups?.find(f => f.id === id);
  if (f) { loadFollowupLeads().then(() => openFollowupModal(f)); }
}

async function completeFollowup(id) {
  try { await api('PATCH', `/followups/${id}/complete`); toast('Concluído', 'success'); loadFollowups(); } catch (e) { toast(e.message, 'error'); }
}

async function deleteFollowup(id) {
  if (!confirm('Excluir este acompanhamento?')) return;
  try { await api('DELETE', `/followups/${id}`); toast('Excluído', 'success'); loadFollowups(); } catch (e) { toast(e.message, 'error'); }
}

async function loadFollowupsOverdue() {
  showLoader();
  try {
    const overdue = await api('GET', '/followups/overdue/list');
    state.followups = overdue || [];
    renderFollowups();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

document.getElementById('btn-new-followup')?.addEventListener('click', () => { loadFollowupLeads().then(() => openFollowupModal(null)); });
document.getElementById('btn-refresh-followups')?.addEventListener('click', loadFollowups);
document.getElementById('btn-followup-overdue')?.addEventListener('click', loadFollowupsOverdue);
document.getElementById('followup-filter-status')?.addEventListener('change', loadFollowups);
document.getElementById('modal-followup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('followup-id').value;
  const body = {
    lead_id: document.getElementById('followup-lead').value || null,
    action: document.getElementById('followup-action').value,
    description: document.getElementById('followup-desc').value,
    due_date: document.getElementById('followup-due').value || null,
    priority: document.getElementById('followup-priority').value,
    notes: document.getElementById('followup-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/followups/${id}`, body); toast('Atualizado', 'success'); }
    else { await api('POST', '/followups', body); toast('Criado', 'success'); }
    closeModal('modal-followup'); loadFollowups();
  } catch (e) { toast(e.message, 'error'); }
});

/* ── NOVOS MÓDULOS: HUNTER ──────────────────────────────────────────── */

let hunterPage = 1;
async function loadHunter(page) {
  if (page) hunterPage = page;
  showLoader();
  try {
    const url = `/hunter/enrichments?page=${hunterPage}&limit=10`;
    const res = await api('GET', url);
    state.enrichments = res.enrichments || [];
    renderHunter();
  } catch (e) { toast(e.message, 'error'); }
  try {
    const top = await api('GET', '/hunter/top-leads?limit=10');
    const tb = document.getElementById('hunter-top-tbody');
    if (tb) tb.innerHTML = (top || []).map(l => `<tr><td><strong>${esc(l.name)}</strong></td><td><span class="badge badge-${l.avg_score >= 70 ? 'active' : l.avg_score >= 40 ? 'in_progress' : 'pending'}">${parseFloat(l.avg_score || 0).toFixed(1)}</span></td><td>${l.enrichment_count || 0}</td><td style="text-align:right"><button class="btn-icon" onclick="navigate('leads')" title="Ver Lead">→</button></td></tr>`).join('');
  } catch {}
  finally { hideLoader(); }
}

function renderHunter() {
  const tbody = document.getElementById('hunter-tbody');
  const empty = document.getElementById('hunter-empty');
  const pagEl = document.getElementById('hunter-pagination');
  const list = state.enrichments || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (pagEl) pagEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = list.map(e => `<tr>
    <td>${esc(e.lead_name || '—')}</td>
    <td>${esc(e.source || '—')}</td>
    <td>${e.score != null ? e.score : '—'}</td>
    <td>${e.created_at ? fmtDate(e.created_at) : '—'}</td>
    <td style="text-align:right"><button class="btn-icon" onclick="deleteEnrichment('${e.id}')" title="Excluir" style="color:var(--red)">✕</button></td></tr>`).join('');
}

async function loadEnrichmentLeads() {
  try {
    const leads = await api('GET', '/leads?page=1&limit=500');
    const sel = document.getElementById('enrichment-lead');
    if (sel) sel.innerHTML = '<option value="">Selecione</option>' + (leads.leads || leads || []).map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
  } catch {}
}

async function deleteEnrichment(id) {
  if (!confirm('Excluir este enriquecimento?')) return;
  try { await api('DELETE', `/hunter/enrichments/${id}`); toast('Excluído', 'success'); loadHunter(); } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-enrichment')?.addEventListener('click', () => { loadEnrichmentLeads().then(() => openModal('modal-enrichment')); });
document.getElementById('btn-refresh-hunter')?.addEventListener('click', loadHunter);
document.getElementById('modal-enrichment-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  let data = document.getElementById('enrichment-data').value;
  try { data = JSON.parse(data); } catch { data = data || '{}'; }
  const body = {
    lead_id: document.getElementById('enrichment-lead').value || null,
    source: document.getElementById('enrichment-source').value,
    score: parseInt(document.getElementById('enrichment-score').value) || null,
    data: typeof data === 'string' ? data : JSON.stringify(data),
  };
  try {
    await api('POST', '/hunter/enrichments', body);
    toast('Enriquecimento salvo', 'success');
    closeModal('modal-enrichment'); loadHunter();
  } catch (e) { toast(e.message, 'error'); }
});

/* Override navigate to include all modules */
const _origNavigate = navigate;
navigate = function(page) {
  _origNavigate(page);
  if (page === 'equipment') loadEquipment();
  if (page === 'service-orders') loadServiceOrders();
  if (page === 'contracts') loadContracts();
  if (page === 'calendar') loadCalendar();
  if (page === 'bi') loadBI();
  if (page === 'invoices') loadInvoices();
  if (page === 'proposals') loadProposals();
  if (page === 'projects') loadProjects();
  if (page === 'tickets') loadTickets();
  if (page === 'rental') loadRental();
  if (page === 'campaigns') loadCampaigns();
  if (page === 'followups') loadFollowups();
  if (page === 'hunter') loadHunter();
  setTimeout(() => addExportButtons(page), 100);
};

/* ── Utilities ──────────────────────────────────────────────────────────── */

function esc(s) {
  const div = document.createElement('div');
  div.textContent = s ?? '';
  return div.innerHTML;
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  } catch { return d; }
}

function copyText(t) {
  navigator.clipboard.writeText(t).then(() => toast('Copiado!', 'success')).catch(() => toast('Erro ao copiar', 'error'));
}

function fmtCurrency(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

/* ── Event Listeners ────────────────────────────────────────────────────── */

/* ── Sidebar Toggle ───────────────────────────────────────────────────────── */

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (!sidebar) return;
  sidebar.classList.toggle('active');
  if (overlay) overlay.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar) sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

document.querySelector('.hamburger')?.addEventListener('click', toggleSidebar);
document.querySelector('.sidebar-overlay')?.addEventListener('click', closeSidebar);
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => {
    navigate(item.dataset.page);
    closeSidebar();
  });
});

document.getElementById('btn-logout').addEventListener('click', logout);

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('login-error');
  err.style.display = 'none';
  try {
    await login(
      document.getElementById('login-user').value,
      document.getElementById('login-pass').value
    );
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
});

/* ── Init ───────────────────────────────────────────────────────────────── */

(async function init() {
  if (state.token) {
    try {
      const me = await api('GET', '/auth/me');
      state.user = me;
      showApp();
      return;
    } catch {
      // token expired or invalid
      localStorage.removeItem('grt_token');
      state.token = null;
    }
  }
  showLogin();
})();
