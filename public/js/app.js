/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   GRT CRM â€” Frontend Application
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const API = (function() {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3002';
  }
  return '/api'; // Vercel proxy ou produção
})();

/* â”€â”€ Safe DOM helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function on(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
}

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
  activityLogs: [],
  stages: [],
  notifications: [],
  routines: [],
};

/* â”€â”€ HTTP helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

let isRefreshing = false;

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !path.includes('/auth/')) {
    const refreshToken = localStorage.getItem('grt_refresh_token');
    if (refreshToken && !isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          state.token = refreshData.token;
          state.user = refreshData.user;
          localStorage.setItem('grt_token', refreshData.token);
          localStorage.setItem('grt_refresh_token', refreshData.refreshToken);
          isRefreshing = false;
          headers['Authorization'] = `Bearer ${state.token}`;
          const retryRes = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
          const retryData = await retryRes.json().catch(() => ({}));
          if (!retryRes.ok) throw new Error(retryData.error || `Erro ${retryRes.status}`);
          return retryData;
        }
      } catch (e) {
        isRefreshing = false;
        localStorage.removeItem('grt_refresh_token');
        logout();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      isRefreshing = false;
    } else if (!refreshToken) {
      logout();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) { throw new Error(data.error || `Erro ${res.status}`); }
  return data;
}

/* â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container') || document.body;
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.textContent = msg;
  container.appendChild(div);

  // Use GSAP for smooth animation if available
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(div,
      { opacity: 0, x: 30, scale: 0.95 },
      { opacity: 1, x: 0, scale: 1, duration: 0.35, ease: 'back.out(1.4)' }
    );
    gsap.to(div, {
      opacity: 0, x: 30, duration: 0.25, ease: 'power2.in',
      delay: 3.2, onComplete: () => div.remove()
    });
  } else {
    requestAnimationFrame(() => div.classList.add('show'));
    setTimeout(() => { div.classList.remove('show'); setTimeout(() => div.remove(), 300); }, 3500);
  }
}

/* â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function login(username, password) {
  const data = await api('POST', '/auth/login', { username, password });
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('grt_token', data.token);
  localStorage.setItem('grt_refresh_token', data.refreshToken);
  showApp();
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('grt_token');
  localStorage.removeItem('grt_refresh_token');
  showLogin();
}

/* â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function navigate(page) {
  const sidebar = document.getElementById('sidebar');
  if (page === 'dashboard') {
    sidebar.classList.remove('collapsed');
  } else {
    sidebar.classList.add('collapsed');
  }

  // Animate current page out
  const currentPage = document.querySelector('.page.active');
  if (currentPage && typeof gsap !== 'undefined') {
    gsap.to(currentPage, { opacity: 0, y: -8, duration: 0.15, ease: 'power2.out', onComplete: () => {
      currentPage.classList.remove('active');
      currentPage.style.opacity = '';
      currentPage.style.transform = '';
      showNewPage(page);
    }});
  } else {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    showNewPage(page);
  }

  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');
}

function showNewPage(page) {
  const pg = document.getElementById(`page-${page}`);
  if (!pg) return;
  pg.classList.add('active');
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(pg, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }
  const titles = { dashboard: 'Dashboard', deals: 'Pipeline', kanban: 'Kanban Comercial', leads: 'Leads', companies: 'Empresas', tasks: 'Tarefas', routines: 'Rotinas Dià ¡rias', equipment: 'Equipamentos', 'service-orders': 'Ordens de Serviço', contracts: 'Contratos', calendar: 'Calendà ¡rio', webhooks: 'Webhooks', apikeys: 'API Keys', logs: 'Atividades', bi: 'BI Analytics', invoices: 'Faturamento', proposals: 'Propostas', projects: 'Obras & Projetos', rental: 'Locação', campaigns: 'Campanhas', hunter: 'Hunter', users: 'Colaboradores' };
  document.getElementById('page-title').textContent = titles[page] || page;
  // load data
  if (page === 'dashboard') loadDashboard();
  if (page === 'leads') loadLeads();
  if (page === 'kanban') loadKanban();
  if (page === 'deals') { if (!state.companies || state.companies.length === 0) loadCompanies(); loadDeals(); }
  if (page === 'companies') loadCompanies();
  if (page === 'tasks') loadTasks();
  if (page === 'routines') loadRoutines();
  if (page === 'webhooks') loadWebhooks();
  if (page === 'apikeys') loadApiKeys();
  if (page === 'logs') loadLogs();
}

/* â”€â”€ UI show/hide â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function showLogin() {
  document.getElementById('page-login').style.display = 'flex';
  document.getElementById('page-app').style.display = 'none';
}

function showApp() {
  document.getElementById('page-login').style.display = 'none';
  document.getElementById('page-app').style.display = 'flex';
  document.getElementById('user-display').textContent = state.user?.name || state.user?.username || 'admin';
  // Avatar with initials
  const avatar = document.getElementById('user-avatar');
  if (avatar) {
    const name = state.user?.name || state.user?.username || 'A';
    avatar.textContent = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatar.title = state.user?.name || state.user?.username || 'Admin';
  }
  // Aplica role-based visibility na sidebar
  applyRoleFilter();
  // Navega para pà ¡gina inicial conforme role
  const role = state.user?.role || '';
  navigate(role === 'comercial' ? 'kanban' : 'dashboard');
}

function applyRoleFilter() {
  const role = state.user?.role || '';
  
  // CEO e Developer vêem TUDO â€” sem filtro
  if (!role || role === 'ceo' || role === 'developer') {
    document.querySelectorAll('[data-role]').forEach(el => el.style.display = '');
    return;
  }
  
  // Demais roles só veem itens com data-role contendo a role
  document.querySelectorAll('[data-role]').forEach(el => {
    const roles = (el.dataset.role || '').split(',').map(r => r.trim());
    el.style.display = roles.includes(role) ? '' : 'none';
  });
}

/* â”€â”€ Modal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  const modal = el.querySelector('.modal');
  if (modal && typeof gsap !== 'undefined') {
    gsap.fromTo(modal, { opacity: 0, scale: 0.92, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' });
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const modal = el.querySelector('.modal');
  const onClose = () => {
    el.classList.remove('open');
    if (id === 'modal-invoice') resetInvoiceDetailMode();
    if (id === 'modal-proposal') resetProposalDetailMode();
  };
  if (modal && typeof gsap !== 'undefined') {
    gsap.to(modal, { opacity: 0, scale: 0.95, y: 10, duration: 0.2, ease: 'power2.in', onComplete: onClose });
  } else {
    onClose();
  }
}

document.querySelectorAll('.close-modal').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  });
});
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); });
});

/* â”€â”€ LEADS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
      <td>${esc(l.company || 'â€”')}</td>
      <td>${esc(l.email || 'â€”')}</td>
      <td>${esc(l.phone || 'â€”')}</td>
      <td><span class="badge badge-${l.status}">${statusLabel(l.status)}</span></td>
      <td>${esc(l.source || 'â€”')}</td>
      <td>${fmtDate(l.created_at)}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editLead('${l.id}')" title="Editar">âœŽ</button>
        <button class="btn-icon" onclick="deleteLead('${l.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
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
    document.getElementById('stat-total').textContent = stats.total ?? 'â€”';
    document.getElementById('stat-new').textContent = stats.byStatus?.new ?? stats.new ?? 'â€”';
    document.getElementById('stat-converted').textContent = stats.byStatus?.converted ?? stats.converted ?? 'â€”';
    document.getElementById('stat-lost').textContent = stats.byStatus?.lost ?? stats.lost ?? 'â€”';
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

    // Companies count
    try {
      const compRes = await api('GET', '/companies');
      state.companies = Array.isArray(compRes) ? compRes : (compRes.companies || []);
      document.getElementById('stat-companies').textContent = state.companies.length;
    } catch { document.getElementById('stat-companies').textContent = 'â€”'; }

    // Tasks pending
    try {
      state.tasks = await api('GET', '/tasks');
      const pending = state.tasks.filter(t => t.status !== 'done').length;
      document.getElementById('stat-tasks-pending').textContent = pending;
      document.getElementById('task-count-badge').textContent = pending;
    } catch { document.getElementById('stat-tasks-pending').textContent = 'â€”'; }

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

on('btn-new-lead', 'click', () => openLeadModal(null));

on('modal-lead-form', 'submit', async (e) => {
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

on('lead-search', 'input', renderLeads);
on('lead-filter-status', 'change', renderLeads);
on('btn-refresh-leads', 'click', loadLeads);

/* â”€â”€ COMPANIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* â”€â”€ Pagination state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const pagination = {
  companies: { page: 1, limit: 10, total: 0, totalPages: 0 },
  deals: { page: 1, limit: 10, total: 0, totalPages: 0 },
  'service-orders': { page: 1, limit: 10, total: 0, totalPages: 0 },
  contracts: { page: 1, limit: 10, total: 0, totalPages: 0 },
  equipment: { page: 1, limit: 10, total: 0, totalPages: 0 },
  invoices: { page: 1, limit: 10, total: 0, totalPages: 0 },
  proposals: { page: 1, limit: 10, total: 0, totalPages: 0 },
  projects: { page: 1, limit: 10, total: 0, totalPages: 0 },
  tasks: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

function paginationContainer(key, loadFn) {
  const p = pagination[key];
  const btn = (page, label, active) =>
    `<button class="page-btn${active ? ' active' : ''}" onclick="${loadFn.name}(${page})" ${page < 1 || page > p.totalPages ? 'disabled' : ''}>${esc(label)}</button>`;
  return `
    <div class="pagination">
      ${btn(p.page - 1, 'â€¹ Anterior')}
      ${btn(1, '1')}
      ${p.totalPages > 1 && p.page > 3 ? '<span class="page-info">â€¦</span>' : ''}
      ${p.page > 2 && p.page < p.totalPages ? btn(p.page, p.page) : ''}
      ${p.totalPages > 1 && p.page < p.totalPages - 1 ? '<span class="page-info">â€¦</span>' : ''}
      ${p.totalPages > 1 ? btn(p.totalPages, p.totalPages, p.page === p.totalPages) : ''}
      ${btn(p.page + 1, 'Próximo â€º')}
      <span class="page-info">Pà ¡gina ${p.page} de ${p.totalPages} (${p.total} itens)</span>
    </div>`;
}

/* â”€â”€ Loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function showLoader() {
  document.getElementById('app-loader').style.display = 'flex';
}

function hideLoader() {
  document.getElementById('app-loader').style.display = 'none';
}

/* â”€â”€ Dark Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function initTheme() {
  const saved = localStorage.getItem('grt_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-icon').innerHTML = '<i class="fa-solid fa-sun"></i>';
    document.getElementById('theme-label').textContent = 'Modo Claro';
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const icon = document.getElementById('theme-icon');
  if (isDark) {
    html.removeAttribute('data-theme');
    localStorage.setItem('grt_theme', 'light');
    icon.innerHTML = '<i class="fa-solid fa-moon"></i>';
    document.getElementById('theme-label').textContent = 'Modo Escuro';
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('grt_theme', 'dark');
    icon.innerHTML = '<i class="fa-solid fa-sun"></i>';
    document.getElementById('theme-label').textContent = 'Modo Claro';
  }
}

document.addEventListener('DOMContentLoaded', initTheme);
document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);

/* â”€â”€ COMPANIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
      <td>${esc(c.email || 'â€”')}</td>
      <td>${esc(c.phone || 'â€”')}</td>
      <td>${esc(c.cnpj ? c.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : 'â€”')}</td>
      <td>${esc(c.city || 'â€”')}</td>
      <td><span class="badge badge-${c.active !== false ? 'active' : 'inactive'}">${c.active !== false ? 'Ativa' : 'Inativa'}</span></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editCompany('${c.id}')" title="Editar">âœŽ</button>
        <button class="btn-icon" onclick="deleteCompany('${c.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
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

on('btn-new-company', 'click', () => openCompanyModal(null));

on('modal-company-form', 'submit', async (e) => {
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

on('company-search', 'input', renderCompanies);
on('company-filter-status', 'change', renderCompanies);
on('btn-refresh-companies', 'click', loadCompanies);

/* â”€â”€ DEALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
          ${deals.length === 0 ? '<div class="pipeline-empty-col">Arraste negócios para cà ¡</div>' : ''}
          ${deals.map(d => `
            <div class="deal-card" draggable="true" ondragstart="onDealDragStart(event, '${d.id}')" onclick="editDeal('${d.id}')">
              <div class="deal-card-title">${esc(d.title)}</div>
              ${d.value ? `<div class="deal-card-value">${fmtCurrency(d.value)}</div>` : ''}
              ${d.company_name ? `<div class="deal-card-company">${esc(d.company_name)}</div>` : ''}
              ${d.contact_name ? `<div class="deal-card-contact">${esc(d.contact_name)}</div>` : ''}
              <div class="deal-card-actions">
                <button class="btn-icon-sm" onclick="event.stopPropagation();deleteDeal('${d.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
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

on('btn-new-deal', 'click', async () => {
  // Ensure companies are loaded for the dropdown
  if (!state.companies || !Array.isArray(state.companies)) {
    try { const coRes = await api('GET', '/companies'); state.companies = coRes.companies || coRes.data || []; } catch {}
  }
  openDealModal(null);
});

on('modal-deal-form', 'submit', async (e) => {
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

/* â”€â”€ TASKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadTasks(page) {
  if (page) pagination.tasks.page = page;
  try {
    const p = pagination.tasks;
    const res = await api('GET', `/tasks?page=${p.page}&limit=${p.limit}`);
    state.tasks = res.tasks || [];
    pagination.tasks.total = res.total || 0;
    pagination.tasks.totalPages = res.totalPages || 1;
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
      <td>${t.due_date ? fmtDate(t.due_date) : 'â€”'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editTask('${t.id}')" title="Editar">âœŽ</button>
        <button class="btn-icon" onclick="deleteTask('${t.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('task-count-badge').textContent = state.tasks.filter(t => t.status !== 'done').length;
  const paginationEl = document.getElementById('tasks-pagination');
  if (paginationEl) paginationEl.innerHTML = paginationContainer('tasks', loadTasks);
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

on('btn-new-task', 'click', () => openTaskModal(null));

on('modal-task-form', 'submit', async (e) => {
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

on('task-filter-status', 'change', renderTasks);
on('task-filter-priority', 'change', renderTasks);
on('btn-refresh-tasks', 'click', loadTasks);

/* â”€â”€ ROTINAS DIà RIAS / KANBAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadRoutines() {
  try {
    const data = await api('GET', '/api/daily-routines');
    state.routines = Array.isArray(data) ? data : [];
    renderRoutines();
    loadUsersForRoutines();
  } catch (e) { toast(e.message, 'error'); }
}

function renderRoutines() {
  const filterUser = document.getElementById('routine-filter-user').value;
  let routines = state.routines;
  if (filterUser) routines = routines.filter(r => r.assigned_to === filterUser);

  const columns = ['pending', 'in_progress', 'done'];
  const columnIds = ['kanban-pending', 'kanban-progress', 'kanban-done'];
  const countIds = ['count-pending', 'count-progress', 'count-done'];

  columns.forEach((col, i) => {
    const items = routines.filter(r => r.status === col);
    const body = document.getElementById(columnIds[i]);
    if (!body) return;
    document.getElementById(countIds[i]).textContent = items.length;

    if (items.length === 0) {
      body.innerHTML = '<div class="pipeline-empty-col">Nenhuma tarefa</div>';
      return;
    }

    body.innerHTML = items.map(r => `
      <div class="kanban-card" draggable="true" data-id="${r.id}" data-status="${r.status}"
           ondragstart="dragRoutine(event)" onclick="editRoutine('${r.id}')">
        <div class="kanban-card-title">${esc(r.title)}</div>
        ${r.description ? `<div class="kanban-card-desc">${esc(r.description.substring(0, 100))}</div>` : ''}
        <div class="kanban-card-meta">
          <span class="kanban-card-assignee">ðŸ‘¤ ${esc(r.assigned_to || 'â€”')}</span>
          <span class="kanban-card-due ${isOverdue(r.due_date) && r.status !== 'done' ? 'overdue' : ''}">ðŸ“… ${formatDateKanban(r.due_date)}</span>
        </div>
        <div style="margin-top:6px;display:flex;gap:4px;justify-content:space-between;align-items:center">
          <span class="badge badge-${r.priority || 'medium'}">${routinePriorityLabel(r.priority)}</span>
          <span>
            <button class="btn-icon-sm" onclick="event.stopPropagation();editRoutine('${r.id}')" title="Editar">âœŽ</button>
            <button class="btn-icon-sm" onclick="event.stopPropagation();deleteRoutine('${r.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
          </span>
        </div>
      </div>
    `).join('');
  });
}

// Drag & Drop
function dragRoutine(e) {
  e.dataTransfer.setData('text/plain', e.target.closest('.kanban-card').dataset.id);
  e.dataTransfer.setData('status', e.target.closest('.kanban-card').dataset.status);
}

function allowDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function dropRoutine(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const id = e.dataTransfer.getData('text/plain');
  const newColumn = e.currentTarget.closest('.kanban-column').dataset.column;
  const card = document.querySelector(`.kanban-card[data-id="${id}"]`);
  if (card) {
    const oldStatus = card.dataset.status;
    if (oldStatus !== newColumn) {
      updateRoutineStatus(id, newColumn);
    }
  }
}

async function updateRoutineStatus(id, newStatus) {
  try {
    await api('PATCH', `/api/daily-routines/${id}`, { status: newStatus });
    toast('Status atualizado', 'success');
    loadRoutines();
  } catch (e) { toast(e.message, 'error'); }
}

// Modal CRUD
function openRoutineModal(routine) {
  document.getElementById('modal-routine-title').textContent = routine ? 'Editar Tarefa' : 'Nova Tarefa';
  document.getElementById('routine-id').value = routine ? routine.id : '';
  document.getElementById('routine-title').value = routine ? (routine.title || '') : '';
  document.getElementById('routine-desc').value = routine ? (routine.description || '') : '';
  document.getElementById('routine-status').value = routine ? (routine.status || 'pending') : 'pending';
  document.getElementById('routine-priority').value = routine ? (routine.priority || 'medium') : 'medium';
  document.getElementById('routine-assigned-to').value = routine ? (routine.assigned_to || '') : '';
  document.getElementById('routine-due').value = routine ? (routine.due_date ? routine.due_date.substring(0, 10) : '') : '';
  openModal('modal-routine');
}

function editRoutine(id) {
  const item = state.routines.find(r => r.id == id);
  if (item) openRoutineModal(item);
}

async function deleteRoutine(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  try {
    await api('DELETE', `/api/daily-routines/${id}`);
    toast('Tarefa excluída', 'success');
    loadRoutines();
  } catch (e) { toast(e.message, 'error'); }
}

async function loadUsersForRoutines() {
  try {
    const users = await api('GET', '/users');
    const selectFilter = document.getElementById('routine-filter-user');
    const selectAssign = document.getElementById('routine-assigned-to');
    if (selectAssign) {
      const cv = selectAssign.value;
      selectAssign.innerHTML = '<option value="">Selecione...</option>' +
        users.map(u => `<option value="${esc(u.name || u.email)}">${esc(u.name || u.email)}</option>`).join('');
      selectAssign.value = cv;
    }
    if (selectFilter) {
      const cv = selectFilter.value;
      selectFilter.innerHTML = '<option value="">Todos os usuà ¡rios</option>' +
        users.map(u => `<option value="${esc(u.name || u.email)}">${esc(u.name || u.email)}</option>`).join('');
      selectFilter.value = cv;
    }
  } catch (e) { /* users may not be available */ }
}

// Event listeners
on('btn-new-routine', 'click', () => openRoutineModal(null));
on('btn-refresh-routines', 'click', loadRoutines);
on('routine-filter-user', 'change', renderRoutines);

on('modal-routine-form', 'submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('routine-id').value;
  const body = {
    title: document.getElementById('routine-title').value,
    description: document.getElementById('routine-desc').value || null,
    status: document.getElementById('routine-status').value,
    priority: document.getElementById('routine-priority').value,
    assigned_to: document.getElementById('routine-assigned-to').value || null,
    due_date: document.getElementById('routine-due').value || null,
  };
  try {
    if (id) {
      await api('PATCH', `/api/daily-routines/${id}`, body);
      toast('Tarefa atualizada', 'success');
    } else {
      await api('POST', '/api/daily-routines', body);
      toast('Tarefa criada', 'success');
    }
    closeModal('modal-routine');
    loadRoutines();
  } catch (e) { toast(e.message, 'error'); }
});

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

/* â”€â”€ WEBHOOKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
          <button class="btn-icon" onclick="editInbound('${w.id}')" title="Editar">âœŽ</button>
          <button class="btn-icon" onclick="copyText('${url}')" title="Copiar URL">ðŸ“‹</button>
          <button class="btn-icon" onclick="deleteInbound('${w.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
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
        <button class="btn-icon" onclick="editOutbound('${w.id}')" title="Editar">âœŽ</button>
        <button class="btn-icon" onclick="deleteOutbound('${w.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
      </div>
    </div>
  `).join('');
}

async function editInbound(id) {
  const item = state.inbounds.find(w => w.id == id);
  if (!item) return;
  document.getElementById('modal-inbound-title').textContent = 'Editar Webhook Inbound';
  document.getElementById('inbound-id').value = item.id;
  document.getElementById('inbound-name').value = item.name || '';
  document.getElementById('inbound-desc').value = item.description || '';
  openModal('modal-inbound');
}

async function deleteInbound(id) {
  if (!confirm('Excluir este webhook inbound?')) return;
  try {
    await api('DELETE', `/settings/webhooks/inbound/${id}`);
    toast('Webhook excluído', 'success');
    loadWebhooks();
  } catch (e) { toast(e.message, 'error'); }
}

async function editOutbound(id) {
  const item = state.outbounds.find(w => w.id == id);
  if (!item) return;
  document.getElementById('modal-outbound-title').textContent = 'Editar Webhook Outbound';
  document.getElementById('outbound-id').value = item.id;
  document.getElementById('outbound-name').value = item.name || '';
  document.getElementById('outbound-url').value = item.url || '';
  document.querySelectorAll('#modal-outbound-form input[type="checkbox"]').forEach(c => {
    c.checked = (item.events || []).includes(c.value);
  });
  openModal('modal-outbound');
}

async function deleteOutbound(id) {
  if (!confirm('Excluir este webhook outbound?')) return;
  try {
    await api('DELETE', `/settings/webhooks/outbound/${id}`);
    toast('Webhook excluído', 'success');
    loadWebhooks();
  } catch (e) { toast(e.message, 'error'); }
}

on('btn-new-inbound', 'click', () => {
  document.getElementById('modal-inbound-title').textContent = 'Novo Webhook Inbound';
  document.getElementById('inbound-id').value = '';
  document.getElementById('inbound-name').value = '';
  document.getElementById('inbound-desc').value = '';
  openModal('modal-inbound');
});

on('modal-inbound-form', 'submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('inbound-id').value;
  const body = {
    name: document.getElementById('inbound-name').value,
    description: document.getElementById('inbound-desc').value,
  };
  try {
    if (id) {
      await api('PATCH', `/settings/webhooks/inbound/${id}`, body);
    } else {
      await api('POST', '/settings/webhooks/inbound', body);
    }
    toast(id ? 'Webhook atualizado' : 'Webhook inbound criado', 'success');
    closeModal('modal-inbound');
    loadWebhooks();
  } catch (e) { toast(e.message, 'error'); }
});

on('btn-new-outbound', 'click', () => {
  document.getElementById('outbound-id').value = '';
  document.getElementById('outbound-name').value = '';
  document.getElementById('outbound-url').value = '';
  document.querySelectorAll('#modal-outbound-form input[type="checkbox"]').forEach(c => c.checked = c.value === 'lead.created');
  openModal('modal-outbound');
});

on('modal-outbound-form', 'submit', async (e) => {
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

/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

document.querySelectorAll('.tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
    document.getElementById(`tab-${target}`).style.display = 'block';
  });
});

/* â”€â”€ API KEYS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
        <button class="btn-icon" onclick="editApiKey('${k.id}')" title="Editar">âœŽ</button>
        <button class="btn-icon" onclick="toggleApiKey('${k.id}')" title="${k.active ? 'Desativar' : 'Ativar'}">${k.active ? 'âŠ˜' : 'âœ“'}</button>
        <button class="btn-icon" onclick="deleteApiKey('${k.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
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

on('btn-new-apikey', 'click', () => {
  document.getElementById('apikey-name').value = '';
  openModal('modal-apikey');
});

on('modal-apikey-form', 'submit', async (e) => {
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

on('btn-copy-key', 'click', () => {
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

/* â”€â”€ LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadLogs() {
  try {
    const [webhookLogs, activityData] = await Promise.all([
      api('GET', '/settings/webhooks/logs').catch(() => []),
      api('GET', '/activity-logs?limit=100').catch(() => ({ logs: [] })),
    ]);
    state.logs = webhookLogs;
    state.activityLogs = activityData.logs || [];
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
  const grid = document.getElementById('logs-users-grid');
  const empty = document.getElementById('logs-empty');
  if (!grid) return;
  const activityLogs = state.activityLogs || [];
  const filterType = document.getElementById('logs-filter-type')?.value || '';
  const filtered = filterType ? activityLogs.filter(l => l.action === filterType) : activityLogs;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const usersMap = {};
  filtered.forEach(l => {
    const key = l.user_name || l.user_id || 'Desconhecido';
    if (!usersMap[key]) usersMap[key] = [];
    usersMap[key].push(l);
  });

  const actionColors = { create: '#10b981', update: '#3b82f6', delete: '#ef4444' };
  const actionLabels = { create: 'Criou', update: 'Atualizou', delete: 'Removeu' };
  const entityIcons = { lead: 'fa-solid fa-user-plus', deal: 'fa-solid fa-bullseye', company: 'fa-solid fa-building', task: 'fa-solid fa-check-square', equipment: 'fa-solid fa-cogs', contract: 'fa-solid fa-file-contract', user: 'fa-solid fa-users-gear' };

  grid.innerHTML = Object.entries(usersMap).map(([userName, logs]) => {
    const total = logs.length;
    const creates = logs.filter(l => l.action === 'create').length;
    const updates = logs.filter(l => l.action === 'update').length;
    const deletes = logs.filter(l => l.action === 'delete').length;
    const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return `
      <div class="card" style="overflow:hidden">
        <div style="padding:20px;cursor:pointer" onclick="this.parentElement.querySelector('.logs-user-detail').classList.toggle('open');this.querySelector('.logs-expand-icon').classList.toggle('rotated')">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${initials}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:15px;color:var(--text-primary)">${esc(userName)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${total} atividade${total !== 1 ? 's' : ''}</div>
            </div>
            <i class="fa-solid fa-chevron-down logs-expand-icon" style="color:var(--text-muted);font-size:12px;transition:transform .2s"></i>
          </div>
          <div style="display:flex;gap:16px;margin-top:12px">
            <span style="font-size:11px;color:#10b981;font-weight:600">${creates} criados</span>
            <span style="font-size:11px;color:#3b82f6;font-weight:600">${updates} atualizados</span>
            <span style="font-size:11px;color:#ef4444;font-weight:600">${deletes} removidos</span>
          </div>
        </div>
        <div class="logs-user-detail" style="display:none;max-height:400px;overflow-y:auto;border-top:1px solid var(--border-color)">
          ${logs.slice(0, 50).map(l => {
            const color = actionColors[l.action] || 'var(--text-muted)';
            const icon = entityIcons[l.entity_type] || 'fa-solid fa-circle';
            return `
              <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 20px;border-bottom:1px solid var(--border-light);font-size:13px">
                <div style="width:28px;height:28px;border-radius:6px;background:${color}15;color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:2px"><i class="${icon}"></i></div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span style="font-weight:600;color:var(--text-primary)">${actionLabels[l.action] || l.action}</span>
                    <span style="color:var(--text-muted)">${esc(l.entity_type || '')}</span>
                    <span style="font-weight:600;color:var(--accent)">${esc(l.entity_name || '')}</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${esc(l.details || '')} Â· ${fmtDate(l.created_at)}</div>
                </div>
              </div>
            `;
          }).join('')}
          ${logs.length > 50 ? `<div style="padding:10px 20px;text-align:center;font-size:12px;color:var(--text-muted)">+ ${logs.length - 50} atividades anteriores</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('logs-filter-type')?.addEventListener('change', renderLogs);

on('btn-refresh-logs', 'click', loadLogs);

/* â”€â”€ KANBAN COMERCIAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const KANBAN_LABELS = {
  novo_lead: { label: 'Novo Lead', icon: 'fa-solid fa-star', color: '#f5a623' },
  em_tentativa: { label: 'Em Tentativa', icon: 'fa-solid fa-phone', color: '#3b82f6' },
  em_qualificacao: { label: 'Em Qualificação', icon: 'fa-solid fa-filter', color: '#8b5cf6' },
  reuniao_agendada: { label: 'Reunião Agendada', icon: 'fa-solid fa-calendar-check', color: '#06b6d4' },
  proposta_enviada: { label: 'Proposta Enviada', icon: 'fa-solid fa-file-invoice', color: '#ec4899' },
  contrato_fechamento: { label: 'Contrato/Fechamento', icon: 'fa-solid fa-file-signature', color: '#f97316' },
  ganho: { label: 'Ganho', icon: 'fa-solid fa-trophy', color: '#10b981' },
  perdido: { label: 'Perdido', icon: 'fa-solid fa-times-circle', color: '#ef4444' },
  arquivado: { label: 'Arquivado', icon: 'fa-solid fa-archive', color: '#6b7280' },
};

let kanbanData = null;

async function loadKanban() {
  try {
    const data = await api('GET', '/leads/kanban');
    kanbanData = data;
    renderKanban();
    loadSlaAlerts();
  } catch (e) { toast(e.message, 'error'); }
}

async function loadSlaAlerts() {
  try {
    const alerts = await api('GET', '/leads/sla-alerts');
    const container = document.getElementById('kanban-alerts');
    if (!container) return;
    if (alerts.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    container.innerHTML = alerts.map(a =>
      `<div class="kanban-alert"><i class="fa-solid fa-clock"></i> Lead <strong>${esc(a.name)}</strong> em "${KANBAN_LABELS[a.status]?.label || a.status}" hà ¡ <strong>${a.sla_days} dias</strong> sem atividade</div>`
    ).join('');
  } catch {}
}

function renderKanban() {
  const board = document.getElementById('kanban-board');
  const empty = document.getElementById('kanban-empty');
  if (!board) return;

  if (!kanbanData || kanbanData.every(c => c.leads.length === 0)) {
    board.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  board.innerHTML = kanbanData.map(col => {
    const info = KANBAN_LABELS[col.status] || { label: col.status, icon: 'fa-solid fa-circle', color: '#6b7280' };
    const isTerminal = ['ganho', 'perdido', 'arquivado'].includes(col.status);
    return `
      <div class="kanban-col" data-status="${col.status}">
        <div class="kanban-col-header" style="border-top-color:${info.color}">
          <span class="kanban-col-title"><i class="${info.icon}" style="color:${info.color}"></i> ${info.label}</span>
          <span class="kanban-col-count">${col.count}</span>
        </div>
        <div class="kanban-col-body" id="kanban-body-${col.status}">
          ${col.leads.map(lead => renderKanbanCard(lead, isTerminal)).join('')}
        </div>
      </div>
    `;
  }).join('');
  // Inicializa drag & drop nos cards
  initKanbanDragDrop();
}

function renderKanbanCard(lead, isTerminal) {
  const slaWarning = (lead.status === 'em_tentativa' || lead.status === 'proposta_enviada') && lead.sla_days > 5
    ? `<div class="kanban-sla-warn"><i class="fa-solid fa-clock"></i> ${lead.sla_days}d</div>` : '';
  const term = isTerminal ? ' data-terminal="1"' : '';
  return `
    <div class="kanban-card" data-id="${lead.id}" data-status="${lead.status}" draggable="true"${term}>
      <div class="kanban-card-name">${esc(lead.name)}</div>
      ${lead.company ? `<div class="kanban-card-company">${esc(lead.company)}</div>` : ''}
      <div class="kanban-card-meta">
        <span>${lead.email ? esc(lead.email) : ''}</span>
        ${lead.proposal_value > 0 ? `<span class="kanban-card-value">${fmtCurrency(lead.proposal_value)}</span>` : ''}
      </div>
      ${slaWarning}
      <div class="kanban-card-actions">
        <button class="btn-icon btn-sm" onclick="event.stopPropagation();openKanbanTransition(${lead.id}, '${lead.status}')" title="Mover"><i class="fa-solid fa-arrow-right"></i></button>
        <button class="btn-icon btn-sm" onclick="event.stopPropagation();openLeadModal(${lead.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
      </div>
    </div>
  `;
}

/* â”€â”€ Drag & Drop Kanban â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

let dragSrcId = null;

function initKanbanDragDrop() {
  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend', onDragEnd);
  });
  document.querySelectorAll('.kanban-col-body').forEach(col => {
    col.addEventListener('dragover', onDragOver);
    col.addEventListener('dragenter', onDragEnter);
    col.addEventListener('dragleave', onDragLeave);
    col.addEventListener('drop', onDrop);
  });
}

function onDragStart(e) {
  const card = e.target.closest('.kanban-card');
  if (!card || card.dataset.terminal) { e.preventDefault(); return; }
  dragSrcId = card.dataset.id;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.id);
}

function onDragEnd(e) {
  const card = e.target.closest('.kanban-card');
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.kanban-col-body.drag-over').forEach(c => c.classList.remove('drag-over'));
  dragSrcId = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDragEnter(e) {
  const col = e.target.closest('.kanban-col-body');
  if (col && !col.classList.contains('drag-over')) {
    // Verifica se a coluna tem card sendo arrastado
    const targetStatus = col.closest('.kanban-col')?.dataset.status;
    if (targetStatus && ['ganho','perdido','arquivado'].includes(targetStatus) && dragSrcId) {
      // Terminal columns drop is handled via validation
    }
    col.classList.add('drag-over');
  }
}

function onDragLeave(e) {
  const col = e.target.closest('.kanban-col-body');
  if (col && !col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over');
  }
}

async function onDrop(e) {
  e.preventDefault();
  const col = e.target.closest('.kanban-col-body');
  if (!col) return;
  col.classList.remove('drag-over');

  const toStatus = col.closest('.kanban-col')?.dataset.status;
  const leadId = dragSrcId;
  if (!toStatus || !leadId) return;

  // Se drop na mesma coluna, ignora
  const card = document.querySelector(`.kanban-card[data-id="${leadId}"]`);
  if (card && card.dataset.status === toStatus) return;

  try {
    // Tenta transição; se backend rejeitar, mostra toast com erro
    await api('PATCH', `/leads/${leadId}/transition`, { status: toStatus });
    toast('Lead movido!', 'success');
    loadKanban();
    loadLeads();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function openKanbanTransition(leadId, currentStatus) {
  const cols = ['novo_lead','em_tentativa','em_qualificacao','reuniao_agendada','proposta_enviada','contrato_fechamento','ganho','perdido','arquivado'];
  const terminal = ['ganho','perdido','arquivado'];
  const transitionMap = {
    novo_lead: ['em_tentativa','em_qualificacao','arquivado'],
    em_tentativa: ['em_qualificacao','novo_lead','arquivado'],
    em_qualificacao: ['reuniao_agendada','perdido','arquivado'],
    reuniao_agendada: ['proposta_enviada','em_qualificacao','perdido'],
    proposta_enviada: ['contrato_fechamento','em_tentativa','perdido'],
    contrato_fechamento: ['ganho','perdido','arquivado'],
    ganho: [], perdido: [], arquivado: [],
  };

  if (terminal.includes(currentStatus)) {
    toast('Lead em status final. Não pode ser movido.', 'error');
    return;
  }

  const allowed = transitionMap[currentStatus] || [];
  const modal = document.getElementById('modal-transition');
  if (!modal) return;
  document.getElementById('transition-lead-id').value = leadId;
  document.getElementById('transition-current-status').textContent = KANBAN_LABELS[currentStatus]?.label || currentStatus;

  const select = document.getElementById('transition-status');
  select.innerHTML = allowed.map(s => {
    const info = KANBAN_LABELS[s] || { label: s };
    return `<option value="${s}">${info.label}</option>`;
  }).join('');

  // Mostra campos condicionais
  document.getElementById('transition-field-appointment').style.display = 'none';
  document.getElementById('transition-field-proposal').style.display = 'none';
  document.getElementById('transition-field-lost').style.display = 'none';

  select.onchange = () => {
    const val = select.value;
    document.getElementById('transition-field-appointment').style.display = val === 'reuniao_agendada' ? 'block' : 'none';
    document.getElementById('transition-field-proposal').style.display = val === 'proposta_enviada' ? 'block' : 'none';
    document.getElementById('transition-field-lost').style.display = val === 'perdido' ? 'block' : 'none';
    // Pre-requisite fields from current lead
    if (val === 'reuniao_agendada') {
      document.getElementById('transition-lead-id').value = leadId;
    }
  };

  openModal('modal-transition');
}

on('modal-transition-form', 'submit', async (e) => {
  e.preventDefault();
  const leadId = document.getElementById('transition-lead-id').value;
  const status = document.getElementById('transition-status').value;

  // Collect conditional fields
  const extra = {};
  if (status === 'reuniao_agendada') {
    const date = document.getElementById('transition-appointment-date').value;
    if (!date) { toast('Preencha a data de agendamento', 'error'); return; }
    extra.appointment_date = date;
  }
  if (status === 'proposta_enviada') {
    const val = parseFloat(document.getElementById('transition-proposal-value').value);
    if (!val || val <= 0) { toast('Informe o valor da proposta', 'error'); return; }
    extra.proposal_value = val;
  }
  if (status === 'perdido') {
    const reason = document.getElementById('transition-lost-reason').value.trim();
    if (!reason) { toast('Informe o motivo da perda', 'error'); return; }
    extra.lost_reason = reason;
  }

  try {
    // First update extra fields if any
    if (Object.keys(extra).length > 0) {
      await api('PATCH', `/leads/${leadId}`, extra);
    }
    // Then transition
    await api('PATCH', `/leads/${leadId}/transition`, { status });
    toast('Lead movido com sucesso!', 'success');
    closeModal('modal-transition');
    loadKanban();
    loadLeads();
  } catch (err) { toast(err.message, 'error'); }
});

on('btn-kanban-refresh', 'click', loadKanban);

/* â”€â”€ FASE 3 â€” EQUIPMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadEquipment(page) {
  if (page) pagination.equipment.page = page;
  showLoader();
  try {
    const search = document.getElementById('equipment-search')?.value;
    const status = document.getElementById('equipment-filter-status')?.value;
    const p = pagination.equipment;
    let url = `/equipment?page=${p.page}&limit=${p.limit}`;
    if (status) url += '&status=' + status;
    if (search) url += '&search=' + encodeURIComponent(search);
    const res = await api('GET', url);
    state.equipment = res.equipment || [];
    pagination.equipment.total = res.total || 0;
    pagination.equipment.totalPages = res.totalPages || 1;
    renderEquipment();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderEquipment() {
  const tbody = document.getElementById('equipment-tbody');
  const empty = document.getElementById('equipment-empty');
  const paginationEl = document.getElementById('equipment-pagination');
  if (!tbody) return;
  const list = state.equipment || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (paginationEl) paginationEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { available: 'Disponível', rented: 'Alugado', maintenance: 'Manutenção' };
  tbody.innerHTML = list.map(e => `
    <tr>
      <td><strong>${esc(e.name)}</strong></td>
      <td>${esc(e.type || 'â€”')}</td>
      <td>${esc(e.brand || '')} ${esc(e.model || '')}</td>
      <td>${esc(e.plate || 'â€”')}</td>
      <td><span class="badge badge-${e.status}">${statusMap[e.status] || e.status}</span></td>
      <td style="text-align:right">${e.daily_rate ? fmtCurrency(e.daily_rate) + '/dia' : 'â€”'}</td>
      <td style="text-align:right">${e.monthly_rate ? fmtCurrency(e.monthly_rate) + '/mês' : 'â€”'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editEquipment('${e.id}')" title="Editar">âœŽ</button>
        <button class="btn-icon" onclick="deleteEquipment('${e.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
      </td>
    </tr>
  `).join('');
  if (paginationEl) paginationEl.innerHTML = paginationContainer('equipment', loadEquipment);
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
  document.getElementById('equipment-monthly').value = item ? (item.monthly_rate || '') : '';
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
    monthly_rate: parseFloat(document.getElementById('equipment-monthly').value) || 0,
    status: document.getElementById('equipment-status').value,
    notes: document.getElementById('equipment-notes').value,
  };
  try {
    if (id) { await api('PATCH', `/equipment/${id}`, body); toast('Atualizado', 'success'); }
    else { await api('POST', '/equipment', body); toast('Criado', 'success'); }
    closeModal('modal-equipment'); loadEquipment();
  } catch (e) { toast(e.message, 'error'); }
});

/* â”€â”€ FASE 3 â€” SERVICE ORDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadServiceOrders(page) {
  if (page) pagination['service-orders'].page = page;
  showLoader();
  try {
    const status = document.getElementById('so-filter-status')?.value;
    const priority = document.getElementById('so-filter-priority')?.value;
    const search = document.getElementById('so-search')?.value;
    const p = pagination['service-orders'];
    let url = `/service-orders?page=${p.page}&limit=${p.limit}`;
    if (status) url += '&status=' + status;
    if (priority) url += '&priority=' + priority;
    if (search) url += '&search=' + encodeURIComponent(search);
    const res = await api('GET', url);
    state.orders = res.orders || [];
    pagination['service-orders'].total = res.total || 0;
    pagination['service-orders'].totalPages = res.totalPages || 1;
    renderServiceOrders();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderServiceOrders() {
  const tbody = document.getElementById('so-tbody');
  const empty = document.getElementById('so-empty');
  const paginationEl = document.getElementById('so-pagination');
  if (!tbody) return;
  const list = state.orders || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (paginationEl) paginationEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { open: 'Aberta', in_progress: 'Em Andamento', closed: 'Concluída', cancelled: 'Cancelada' };
  const priorityMap = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  tbody.innerHTML = list.map(o => `
    <tr>
      <td><strong>${esc(o.title)}</strong></td>
      <td>${esc(o.equipment_name || 'â€”')}</td>
      <td>${esc(o.client_name || 'â€”')}</td>
      <td><span class="badge badge-${o.status}">${statusMap[o.status] || o.status}</span></td>
      <td><span class="badge badge-${o.priority || 'medium'}">${priorityMap[o.priority] || o.priority}</span></td>
      <td>${esc(o.assigned_to || 'â€”')}</td>
      <td style="text-align:right">${o.value ? fmtCurrency(o.value) : 'â€”'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editServiceOrder('${o.id}')" title="Editar">âœŽ</button>
        <button class="btn-icon" onclick="deleteServiceOrder('${o.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
      </td>
    </tr>
  `).join('');
  if (paginationEl) paginationEl.innerHTML = paginationContainer('service-orders', loadServiceOrders);
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
  document.getElementById('so-responsible').value = order ? (order.assigned_to || '') : '';

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
    assigned_to: document.getElementById('so-responsible').value || null,
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

/* â”€â”€ FASE 3 â€” CONTRACTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadContracts(page) {
  if (page) pagination.contracts.page = page;
  showLoader();
  try {
    const status = document.getElementById('contract-filter-status')?.value;
    const search = document.getElementById('contract-search')?.value;
    const p = pagination.contracts;
    let url = `/contracts?page=${p.page}&limit=${p.limit}`;
    if (status) url += '&status=' + status;
    if (search) url += '&search=' + encodeURIComponent(search);
    const res = await api('GET', url);
    state.contracts = res.contracts || [];
    pagination.contracts.total = res.total || 0;
    pagination.contracts.totalPages = res.totalPages || 1;
    renderContracts();
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function renderContracts() {
  const tbody = document.getElementById('contracts-tbody');
  const empty = document.getElementById('contracts-empty');
  const paginationEl = document.getElementById('contracts-pagination');
  if (!tbody) return;
  const list = state.contracts || [];
  if (list.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; if (paginationEl) paginationEl.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  const statusMap = { draft: 'Rascunho', active: 'Ativo', expired: 'Expirado', terminated: 'Encerrado' };
  const typeMap = { rental: 'Locação', service: 'Serviço' };
  tbody.innerHTML = list.map(c => `
    <tr>
      <td><strong>${esc(c.title)}</strong></td>
      <td>${esc(c.company_name || 'â€”')}</td>
      <td>${esc(c.equipment_name || 'â€”')}</td>
      <td>${typeMap[c.type] || c.type}</td>
      <td style="text-align:right">${c.value ? fmtCurrency(c.value) : 'â€”'}</td>
      <td style="font-size:12px">${c.start_date ? fmtDate(c.start_date) : 'â€”'} â€” ${c.end_date ? fmtDate(c.end_date) : 'â€”'}</td>
      <td><span class="badge badge-${c.status}">${statusMap[c.status] || c.status}</span></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="editContract('${c.id}')" title="Editar">âœŽ</button>
        <button class="btn-icon" onclick="deleteContract('${c.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
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

/* â”€â”€ FASE 2 â€” CHARTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

  // Leads by source (doughnut)
  const pipeCtx = document.getElementById('chart-pipeline');
  if (pipeCtx && data.leads_by_source) {
    const labels = data.leads_by_source.map(r => r.source);
    const values = data.leads_by_source.map(r => r.count);
    const colors = ['#0F2496', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];

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

/* â”€â”€ Dashboard Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderDashboardSummary(data) {
  if (!data) return;
  
  const { totals, this_month } = data;
  
  // Update stat cards
  if (totals) {
    const el = (id) => document.getElementById(id);
    if (el('stat-total')) el('stat-total').textContent = totals.totalLeads ?? 'â€”';
    if (el('stat-companies')) el('stat-companies').textContent = totals.totalCompanies ?? 'â€”';
    if (el('stat-tasks-pending')) el('stat-tasks-pending').textContent = totals.totalEquipment ?? 'â€”';
  }
  
  if (this_month) {
    const el = (id) => document.getElementById(id);
    if (el('stat-new')) el('stat-new').textContent = this_month.newLeadsThisMonth ?? 'â€”';
    if (el('stat-converted')) el('stat-converted').textContent = this_month.activeContracts ?? 'â€”';
    if (el('stat-lost')) el('stat-lost').textContent = this_month.pendingInvoices ?? 'â€”';
    if (el('stat-deals-won')) el('stat-deals-won').textContent = this_month.activeDeals ?? 'â€”';
  }
}

/* â”€â”€ Funnel Visualization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderFunnel(data) {
  const container = document.getElementById('funnel-container');
  if (!container || !data || !data.stages) return;
  
  const { stages, conversion_rates } = data;
  const maxValue = Math.max(...stages.map(s => s.count), 1);
  
  let html = '<div class="funnel-container">';
  
  stages.forEach((stage, i) => {
    const width = Math.max(30, (stage.count / maxValue) * 100);
    
    html += `
      <div class="funnel-stage">
        <div class="funnel-label">${esc(stage.name)}</div>
        <div class="funnel-bar" style="background:${stage.color};width:${width}%;min-width:80px">
          <span class="funnel-bar-value">${stage.count}</span>
        </div>
      </div>
    `;
    
    if (i < stages.length - 1) {
      const convKey = ['lead_to_qualified', 'qualified_to_proposal', 'proposal_to_won'][i];
      const convRate = conversion_rates?.[convKey] ?? 0;
      html += `
        <div class="funnel-arrow">
          <i class="fa-solid fa-chevron-right"></i>
          <span class="funnel-conversion">${convRate}%</span>
        </div>
      `;
    }
  });
  
  html += '</div>';
  container.innerHTML = html;
}

/* â”€â”€ Activity Rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderActivity(data) {
  if (!data) return;
  
  // Recent Leads
  const recentLeadsEl = document.getElementById('dash-recent-leads');
  if (recentLeadsEl && data.recent_leads) {
    if (data.recent_leads.length === 0) {
      recentLeadsEl.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px">Nenhum lead recente</div>';
    } else {
      recentLeadsEl.innerHTML = data.recent_leads.map(l => `
        <div class="activity-item">
          <div>
            <div class="activity-item-name">${esc(l.name)}</div>
            <div class="activity-item-detail">${esc(l.company || l.source || 'â€”')}</div>
          </div>
          <span class="activity-item-badge badge-${l.status}">${statusLabel(l.status)}</span>
        </div>
      `).join('');
    }
  }
  
  // Expiring Contracts
  const expiringEl = document.getElementById('dash-expiring-contracts');
  if (expiringEl && data.expiring_contracts) {
    if (data.expiring_contracts.length === 0) {
      expiringEl.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px">Nenhum contrato vencendo</div>';
    } else {
      expiringEl.innerHTML = data.expiring_contracts.map(c => `
        <div class="activity-item">
          <div>
            <div class="activity-item-name">${esc(c.title)}</div>
            <div class="activity-item-detail">${esc(c.company_name || 'â€”')} â€¢ Vence: ${fmtDate(c.end_date)}</div>
          </div>
          <span class="activity-item-badge badge-active">Ativo</span>
        </div>
      `).join('');
    }
  }
  
  // Pending Proposals
  const proposalsEl = document.getElementById('dash-pending-proposals');
  if (proposalsEl && data.pending_proposals) {
    if (data.pending_proposals.length === 0) {
      proposalsEl.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px">Nenhuma proposta pendente</div>';
    } else {
      proposalsEl.innerHTML = data.pending_proposals.map(p => `
        <div class="activity-item">
          <div>
            <div class="activity-item-name">${esc(p.title)}</div>
            <div class="activity-item-detail">${esc(p.company_name || 'â€”')} â€¢ ${fmtCurrency(p.value)}</div>
          </div>
          <span class="activity-item-badge badge-${p.status}">${statusLabel(p.status)}</span>
        </div>
      `).join('');
    }
  }
}

/* â”€â”€ Marketing Rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderMarketing(data) {
  if (!data) return;
  
  // Leads by Source
  const sourceEl = document.getElementById('dash-leads-source');
  if (sourceEl && data.leads_by_source) {
    if (data.leads_by_source.length === 0) {
      sourceEl.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px">Sem dados de fontes</div>';
    } else {
      const maxCount = Math.max(...data.leads_by_source.map(s => s.count), 1);
      const colors = ['#0F2496', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      
      sourceEl.innerHTML = data.leads_by_source.map((s, i) => {
        const width = (s.count / maxCount) * 100;
        return `
          <div class="source-bar">
            <span class="source-bar-label">${esc(s.source)}</span>
            <div class="source-bar-track">
              <div class="source-bar-fill" style="width:${width}%;background:${colors[i % colors.length]}"></div>
            </div>
            <span class="source-bar-count">${s.count}</span>
          </div>
        `;
      }).join('');
    }
  }
  
  // Recent Campaigns
  const campaignsEl = document.getElementById('dash-recent-campaigns');
  if (campaignsEl && data.recent_campaigns) {
    if (data.recent_campaigns.length === 0) {
      campaignsEl.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px">Nenhuma campanha</div>';
    } else {
      campaignsEl.innerHTML = data.recent_campaigns.map(c => `
        <div class="campaign-item">
          <div>
            <div style="font-weight:500">${esc(c.name)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${esc(c.type)} â€¢ ${c.sent_count || 0} enviados</div>
          </div>
          <span class="activity-item-badge badge-${c.status}">${statusLabel(c.status)}</span>
        </div>
      `).join('');
    }
  }
}

/* â”€â”€ Fleet Utilization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderFleetUtilization(data) {
  const container = document.getElementById('dash-fleet');
  if (!container || !data) return;
  
  const { total, inUse, available, maintenance, utilization } = data;
  
  if (total === 0) {
    container.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px">Nenhum equipamento cadastrado</div>';
    return;
  }
  
  const inUsePct = ((inUse / total) * 100).toFixed(0);
  const availablePct = ((available / total) * 100).toFixed(0);
  const maintenancePct = ((maintenance / total) * 100).toFixed(0);
  
  container.innerHTML = `
    <div class="fleet-bar">
      <div class="fleet-bar-segment" style="width:${inUsePct}%;background:#f59e0b" title="Em Uso: ${inUse}">${inUsePct > 10 ? inUsePct + '%' : ''}</div>
      <div class="fleet-bar-segment" style="width:${availablePct}%;background:#10b981" title="Disponível: ${available}">${availablePct > 10 ? availablePct + '%' : ''}</div>
      <div class="fleet-bar-segment" style="width:${maintenancePct}%;background:#ef4444" title="Manutenção: ${maintenance}">${maintenancePct > 10 ? maintenancePct + '%' : ''}</div>
    </div>
    <div class="fleet-legend">
      <div class="fleet-legend-item">
        <div class="fleet-legend-dot" style="background:#f59e0b"></div>
        Em Uso (${inUse})
      </div>
      <div class="fleet-legend-item">
        <div class="fleet-legend-dot" style="background:#10b981"></div>
        Disponível (${available})
      </div>
      <div class="fleet-legend-item">
        <div class="fleet-legend-dot" style="background:#ef4444"></div>
        Manutenção (${maintenance})
      </div>
      <div class="fleet-legend-item" style="margin-left:auto;font-weight:600;color:var(--text-primary)">
        Utilização: ${utilization}%
      </div>
    </div>
  `;
}

/* â”€â”€ Top Clients â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function renderTopClients(clients) {
  const tbody = document.getElementById('dash-top-clients');
  if (!tbody || !clients) return;
  
  if (clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px">Nenhum cliente com negócios fechados</td></tr>';
    return;
  }
  
  tbody.innerHTML = clients.map(c => `
    <tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td style="text-align:right">${c.deal_count}</td>
      <td style="text-align:right;font-weight:600;color:var(--green)">${fmtCurrency(c.total_value)}</td>
    </tr>
  `).join('');
}

/* â”€â”€ FASE 2 â€” NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ FASE 2 â€” UPLOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function uploadFile(entityType, entityId, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append(entityType + '_id', entityId);
  formData.append('file', file);

  const headers = {};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  // Note: Don't set Content-Type for multipart â€” fetch sets it automatically with boundary

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
          <a href="/api/files/${f.id}/download" class="btn-link" style="font-size:12px" target="_blank" download>â¬‡</a>
          <button class="btn-link" style="font-size:12px;color:var(--red)" onclick="deleteFile(${f.id},'${entityType}',${entityId})">âœ•</button>
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

/* â”€â”€ FASE 2 â€” EXPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ FASE 2 â€” LOAD DASHBOARD CHARTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

// Augment loadDashboard to also load charts and new dashboard data
const _origLoadDashboard = loadDashboard;
loadDashboard = async function() {
  await _origLoadDashboard.call(this);
  // Load charts data
  try {
    initCharts();
    const chartsData = await api('GET', '/dashboard/charts');
    renderCharts(chartsData);
    // Render fleet utilization from charts data
    if (chartsData.fleet_utilization) {
      renderFleetUtilization(chartsData.fleet_utilization);
    }
    // Render top clients from charts data
    if (chartsData.top_clients) {
      renderTopClients(chartsData.top_clients);
    }
  } catch {}
  // Load new dashboard data
  try {
    const [summary, funnel, activity, marketing] = await Promise.all([
      api('GET', '/dashboard/summary'),
      api('GET', '/dashboard/funnel'),
      api('GET', '/dashboard/activity'),
      api('GET', '/dashboard/marketing'),
    ]);
    renderDashboardSummary(summary);
    renderFunnel(funnel);
    renderActivity(activity);
    renderMarketing(marketing);
  } catch {}
  // Load unread notifications
  loadUnreadCount();
};

/* â”€â”€ FASE 2 â€” EXPORT BUTTONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€--- */

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
  btn.textContent = 'ðŸ“¥ CSV';
  btn.style.marginLeft = '8px';
  btn.onclick = () => exportCsv(exportMap[page]);
  const actionGroup = header.querySelector('div:last-child') || header.lastElementChild;
  if (actionGroup && actionGroup.tagName === 'DIV') {
    actionGroup.appendChild(btn);
  }
}

/* â”€â”€ FASE 4 â€” GLOBAL SEARCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ FASE 4 â€” CALENDAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

  const typeIcon = { service_order: 'ðŸ”§', contract: 'ðŸ“„', task: 'â˜' };
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
        ${typeIcon[ev.type] || 'â€¢'} ${esc(ev.title.substring(0, 20))}
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

/* â”€â”€ NOVOS Mà “DULOS: BI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadBI() {
  showLoader();
  try {
    const kpis = await api('GET', '/bi/kpis');
    document.getElementById('bi-conversion').textContent = kpis.conversionRate != null ? kpis.conversionRate + '%' : 'â€”';
    document.getElementById('bi-avg-ticket').textContent = kpis.avgTicket != null ? fmtCurrency(kpis.avgTicket) : 'â€”';
    document.getElementById('bi-fleet').textContent = kpis.fleetUtilization != null ? kpis.fleetUtilization + '%' : 'â€”';
    document.getElementById('bi-recurrence').textContent = kpis.recurrenceRate != null ? kpis.recurrenceRate + '%' : 'â€”';
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

/* â”€â”€ NOVOS Mà “DULOS: INVOICES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadInvoices(page) {
  if (page) pagination.invoices.page = page;
  showLoader();
  try {
    const status = document.getElementById('invoice-filter-status')?.value || '';
    const p = pagination.invoices;
    let url = `/invoices?page=${p.page}&limit=${p.limit}`;
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.invoices = res.invoices || [];
    pagination.invoices.total = res.total || 0;
    pagination.invoices.totalPages = res.totalPages || 1;
    // Summary stats
    try {
  const summary = await api('GET', '/invoices/summary');
  if (summary) {
    const totalPaid = summary.totalPaidThisMonth || 0;
    const totalPending = summary.totalPending || 0;
    const totalOverdue = summary.totalOverdue || 0;
    document.getElementById('inv-received').textContent = fmtCurrency(totalPaid);
    document.getElementById('inv-pending').textContent = fmtCurrency(totalPending);
    document.getElementById('inv-overdue').textContent = fmtCurrency(totalOverdue);
    document.getElementById('inv-total').textContent = fmtCurrency(totalPending + totalOverdue + totalPaid);
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
    <td>${esc(i.nf_number || 'â€”')}</td>
    <td>${esc(i.company_name || 'â€”')}</td>
    <td>${esc(i.description || 'â€”')}</td>
    <td style="text-align:right">${fmtCurrency(i.value)}</td>
    <td>${i.due_date ? fmtDate(i.due_date) : 'â€”'}</td>
    <td><span class="badge badge-${i.status}">${statusMap[i.status] || i.status}</span></td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="showInvoiceDetail('${i.id}')" title="Detalhes">ðŸ“‹</button>
      <button class="btn-icon" onclick="editInvoice('${i.id}')" title="Editar">âœŽ</button>
      <button class="btn-icon" onclick="deleteInvoice('${i.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
    </td></tr>`).join('');
  if (paginationEl) paginationEl.innerHTML = paginationContainer('invoices', loadInvoices);
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

let _detailInvoiceId = null;

async function showInvoiceDetail(id) {
  showLoader();
  try {
    const inv = await api('GET', '/invoices/' + id);
    _detailInvoiceId = inv.id;
    document.getElementById('modal-invoice-title').textContent = 'Detalhes da Fatura';
    document.getElementById('invoice-id').value = inv.id;

    document.getElementById('invoice-detail-number').textContent = esc(inv.invoice_number || 'â€”');
    document.getElementById('invoice-detail-issue').textContent = inv.issue_date ? fmtDate(inv.issue_date) : 'â€”';
    document.getElementById('invoice-detail-payment').textContent = inv.payment_date ? fmtDate(inv.payment_date) : 'â€”';

    if (inv.contract_id) {
      document.getElementById('invoice-detail-contract-row').style.display = '';
      document.getElementById('invoice-detail-contract').innerHTML = `<a href="#" onclick="navigate('contracts');closeModal('modal-invoice');return false">Ver Contrato #${esc(inv.contract_id)}</a>`;
    } else {
      document.getElementById('invoice-detail-contract-row').style.display = 'none';
    }

    document.getElementById('invoice-detail-fields').style.display = '';
    document.getElementById('invoice-detail-actions').style.display = '';
    document.getElementById('invoice-form-actions').style.display = 'none';

    document.querySelectorAll('#modal-invoice-form input, #modal-invoice-form select, #modal-invoice-form textarea').forEach(el => {
      el.disabled = true;
    });

    loadInvoiceCompanies().then(() => {
      const sel = document.getElementById('invoice-company');
      if (inv.company_id) sel.value = inv.company_id;
    });
    document.getElementById('invoice-description').value = inv.description || '';
    document.getElementById('invoice-value').value = inv.value || '';
    document.getElementById('invoice-due').value = inv.due_date ? inv.due_date.substring(0,10) : '';
    document.getElementById('invoice-status').value = inv.status || 'pending';
    document.getElementById('invoice-notes').value = inv.notes || '';

    openModal('modal-invoice');
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function editInvoiceFromDetail() {
  closeModal('modal-invoice');
  setTimeout(() => editInvoice(_detailInvoiceId), 300);
}

async function deleteInvoiceFromDetail() {
  closeModal('modal-invoice');
  setTimeout(() => deleteInvoice(_detailInvoiceId), 300);
}

document.getElementById('modal-invoice')?.addEventListener('click', function(e) {
  if (e.target === this) resetInvoiceDetailMode();
});

function resetInvoiceDetailMode() {
  _detailInvoiceId = null;
  document.getElementById('invoice-detail-fields').style.display = 'none';
  document.getElementById('invoice-detail-actions').style.display = 'none';
  document.getElementById('invoice-form-actions').style.display = '';
  document.querySelectorAll('#modal-invoice-form input, #modal-invoice-form select, #modal-invoice-form textarea').forEach(el => {
    el.disabled = false;
  });
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

/* â”€â”€ NOVOS Mà “DULOS: PROPOSALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadProposals(page) {
  if (page) pagination.proposals.page = page;
  showLoader();
  try {
    const status = document.getElementById('proposal-filter-status')?.value || '';
    const p = pagination.proposals;
    let url = `/proposals?page=${p.page}&limit=${p.limit}`;
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.proposals = res.proposals || [];
    pagination.proposals.total = res.total || 0;
    pagination.proposals.totalPages = res.totalPages || 1;
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
    <td>${esc(p.company_name || 'â€”')}</td>
    <td>${esc(p.contact_name || 'â€”')}</td>
    <td style="text-align:right">${fmtCurrency(p.value)}</td>
    <td>${p.valid_until ? fmtDate(p.valid_until) : 'â€”'}</td>
    <td><span class="badge badge-${p.status}">${statusMap[p.status] || p.status}</span></td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="showProposalDetail('${p.id}')" title="Detalhes">ðŸ“‹</button>
      <button class="btn-icon" onclick="editProposal('${p.id}')" title="Editar">âœŽ</button>
      <button class="btn-icon" onclick="deleteProposal('${p.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
    </td></tr>`).join('');
  if (pagEl) pagEl.innerHTML = paginationContainer('proposals', loadProposals);
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

let _detailProposalId = null;

async function showProposalDetail(id) {
  showLoader();
  try {
    const p = await api('GET', '/proposals/' + id);
    _detailProposalId = p.id;
    document.getElementById('modal-proposal-title').textContent = 'Detalhes da Proposta';
    document.getElementById('proposal-id').value = p.id;

    document.querySelectorAll('#modal-proposal-form input, #modal-proposal-form select, #modal-proposal-form textarea').forEach(el => {
      el.disabled = true;
    });
    document.getElementById('btn-proposal-add-item').style.display = 'none';

    loadProposalCompanies().then(() => {
      const sel = document.getElementById('proposal-company');
      if (p.company_id) sel.value = p.company_id;
    });
    document.getElementById('proposal-title').value = p.title || '';
    document.getElementById('proposal-contact').value = p.contact_name || '';
    document.getElementById('proposal-valid').value = p.valid_until ? p.valid_until.substring(0,10) : '';
    document.getElementById('proposal-notes').value = p.notes || '';

    const items = p.items || [];
    const itemsTbody = document.getElementById('proposal-detail-items-tbody');
    if (items.length > 0) {
      let total = 0;
      itemsTbody.innerHTML = items.map(item => {
        const qtd = parseFloat(item.quantity) || 1;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const itemTotal = qtd * unitPrice;
        total += itemTotal;
        return `<tr><td>${esc(item.description)}</td><td style="text-align:right">${qtd}</td><td style="text-align:right">${fmtCurrency(unitPrice)}</td><td style="text-align:right;font-weight:600">${fmtCurrency(itemTotal)}</td></tr>`;
      }).join('');
      document.getElementById('proposal-detail-total').textContent = 'Valor Total: ' + fmtCurrency(total);
    } else {
      itemsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px">Nenhum item cadastrado</td></tr>';
      document.getElementById('proposal-detail-total').textContent = '';
    }
    document.getElementById('proposal-detail-items').style.display = '';
    document.getElementById('proposal-detail-actions').style.display = '';
    document.getElementById('proposal-form-actions').style.display = 'none';

    document.querySelectorAll('#modal-proposal-form .proposal-item-row').forEach(r => r.style.display = 'none');

    openModal('modal-proposal');
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

function editProposalFromDetail() {
  closeModal('modal-proposal');
  setTimeout(() => editProposal(_detailProposalId), 300);
}

async function approveProposalFromDetail() {
  if (!confirm('Aprovar esta proposta?')) return;
  try {
    await api('PATCH', `/proposals/${_detailProposalId}`, { status: 'approved' });
    toast('Proposta aprovada!', 'success');
    closeModal('modal-proposal');
    loadProposals();
  } catch (e) { toast(e.message, 'error'); }
}

async function rejectProposalFromDetail() {
  if (!confirm('Recusar esta proposta?')) return;
  try {
    await api('PATCH', `/proposals/${_detailProposalId}`, { status: 'rejected' });
    toast('Proposta recusada', 'info');
    closeModal('modal-proposal');
    loadProposals();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteProposalFromDetail() {
  closeModal('modal-proposal');
  setTimeout(() => deleteProposal(_detailProposalId), 300);
}

function resetProposalDetailMode() {
  _detailProposalId = null;
  document.getElementById('proposal-detail-items').style.display = 'none';
  document.getElementById('proposal-detail-actions').style.display = 'none';
  document.getElementById('proposal-form-actions').style.display = '';
  document.getElementById('btn-proposal-add-item').style.display = '';
  document.querySelectorAll('#modal-proposal-form input, #modal-proposal-form select, #modal-proposal-form textarea').forEach(el => {
    el.disabled = false;
  });
  document.querySelectorAll('#modal-proposal-form .proposal-item-row').forEach(r => r.style.display = '');
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
  row.innerHTML = '<input type="text" placeholder="Descrição" style="flex:3;padding:6px 8px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-color);font-size:12px"><input type="number" placeholder="Qtd" style="width:60px;padding:6px 8px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-color);font-size:12px" min="1" value="1"><input type="number" placeholder="Valor" style="width:100px;padding:6px 8px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-color);font-size:12px" step="0.01" min="0"><button type="button" class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="this.parentElement.remove()">âœ•</button>';
  container.appendChild(row);
});

/* â”€â”€ NOVOS Mà “DULOS: PROJECTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadProjects(page) {
  if (page) pagination.projects.page = page;
  showLoader();
  try {
    const status = document.getElementById('project-filter-status')?.value || '';
    const p = pagination.projects;
    let url = `/projects?page=${p.page}&limit=${p.limit}`;
    if (status) url += '&status=' + status;
    const res = await api('GET', url);
    state.projects = res.projects || [];
    pagination.projects.total = res.total || 0;
    pagination.projects.totalPages = res.totalPages || 1;
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
    <td>${esc(p.company_name || 'â€”')}</td>
    <td><span class="badge badge-${p.status}">${statusMap[p.status] || p.status}</span></td>
    <td style="text-align:right">${fmtCurrency(p.value)}</td>
    <td>${p.start_date ? fmtDate(p.start_date) : 'â€”'}</td>
    <td>${p.end_date ? fmtDate(p.end_date) : 'â€”'}</td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="editProject('${p.id}')" title="Editar">âœŽ</button>
      <button class="btn-icon" onclick="deleteProject('${p.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
    </td></tr>`).join('');
  if (pagEl) pagEl.innerHTML = paginationContainer('projects', loadProjects);
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

/* â”€â”€ PROJECT PHASES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const phaseStatusMap = { pending: 'Pendente', in_progress: 'Em Andamento', completed: 'Concluído' };
let _currentProjectId = null;

async function loadProjectPhases(projectId) {
  _currentProjectId = projectId;
  try {
    const project = await api('GET', '/projects/' + projectId);
    renderPhases(project.phases || []);
  } catch (e) { toast(e.message, 'error'); }
}

function renderPhases(phases) {
  const tbody = document.getElementById('phases-tbody');
  if (!tbody) return;
  if (!phases || phases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px;font-size:13px">Nenhuma fase cadastrada</td></tr>';
    return;
  }
  tbody.innerHTML = phases.map(ph => `
    <tr>
      <td><strong>${esc(ph.name)}</strong>${ph.description ? `<br><span style="font-size:11px;color:var(--text-muted)">${esc(ph.description)}</span>` : ''}</td>
      <td>
        <select class="phase-status-select" data-phase-id="${ph.id}" onchange="updatePhaseStatus('${ph.id}', this.value)" style="font-size:12px;padding:3px 6px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-input);color:var(--text-color)">
          <option value="pending" ${ph.status === 'pending' ? 'selected' : ''}>Pendente</option>
          <option value="in_progress" ${ph.status === 'in_progress' ? 'selected' : ''}>Em Andamento</option>
          <option value="completed" ${ph.status === 'completed' ? 'selected' : ''}>Concluído</option>
        </select>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;min-width:50px">
            <div style="height:100%;width:${ph.progress || 0}%;background:${(ph.progress || 0) >= 100 ? 'var(--green)' : 'var(--accent)'};border-radius:3px;transition:width .3s"></div>
          </div>
          <span style="font-size:11px;white-space:nowrap">${ph.progress || 0}%</span>
        </div>
      </td>
      <td style="font-size:12px">${ph.start_date ? fmtDate(ph.start_date) : 'â€”'}<br>${ph.end_date ? fmtDate(ph.end_date) : 'â€”'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn-icon" onclick="deletePhase('${ph.id}')" title="Excluir fase" style="color:var(--red);font-size:14px">âœ•</button>
      </td>
    </tr>
  `).join('');
}

async function addProjectPhase() {
  if (!_currentProjectId) return;
  const name = prompt('Nome da nova fase:');
  if (!name || !name.trim()) return;
  showLoader();
  try {
    await api('POST', '/projects/' + _currentProjectId + '/phases', { name: name.trim() });
    toast('Fase adicionada!', 'success');
    loadProjectPhases(_currentProjectId);
  } catch (e) { toast(e.message, 'error'); }
  finally { hideLoader(); }
}

async function updatePhaseStatus(phaseId, status) {
  try {
    await api('PATCH', '/projects/phases/' + phaseId, { status });
    toast('Status atualizado', 'success');
    if (_currentProjectId) loadProjectPhases(_currentProjectId);
  } catch (e) { toast(e.message, 'error'); }
}

async function deletePhase(phaseId) {
  if (!confirm('Excluir esta fase?')) return;
  try {
    await api('DELETE', '/projects/phases/' + phaseId);
    toast('Fase excluída', 'success');
    if (_currentProjectId) loadProjectPhases(_currentProjectId);
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-add-phase')?.addEventListener('click', addProjectPhase);

// Override openProjectModal to load phases when editing
const _origOpenProjectModal = openProjectModal;
openProjectModal = function(project) {
  _origOpenProjectModal(project);
  if (project) loadProjectPhases(project.id);
  else {
    _currentProjectId = null;
    const tbody = document.getElementById('phases-tbody');
    if (tbody) tbody.innerHTML = '';
  }
};

/* â”€â”€ NOVOS Mà “DULOS: TICKETS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

let ticketsPage = 1;
/* â”€â”€ NOVOS Mà “DULOS: RENTAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadRental() {
  showLoader();
  try {
    const util = await api('GET', '/rental/utilization');
    if (util) {
      document.getElementById('rental-available').textContent = util.available ?? 'â€”';
      document.getElementById('rental-in-use').textContent = util.inUse ?? 'â€”';
      document.getElementById('rental-mtce').textContent = util.maintenance ?? 'â€”';
      document.getElementById('rental-util').textContent = (util.utilization != null ? util.utilization + '%' : 'â€”');
    }
  } catch {}
  try {
    const avail = await api('GET', '/rental/availability');
    const tb = document.getElementById('rental-tbody');
    if (tb) tb.innerHTML = (avail || []).map(a => `<tr><td>${esc(a.equipment_name || 'â€”')}</td><td>${a.start_date || 'â€”'}</td><td>${a.end_date || 'â€”'}</td><td><span class="badge badge-${a.status}">${esc(a.status)}</span></td><td style="text-align:right"><button class="btn-icon" onclick="deleteRentalBlock(${a.id})" title="Excluir" style="color:var(--red)">âœ•</button></td></tr>`).join('');
  } catch {}
  try {
    const exp = await api('GET', '/rental/expiring?days=15');
    const tb2 = document.getElementById('rental-expiring-tbody');
    if (tb2) tb2.innerHTML = (exp || []).map(c => `<tr><td>${esc(c.title)}</td><td>${esc(c.equipment_name || 'â€”')}</td><td>${esc(c.company_name || 'â€”')}</td><td>${c.end_date || 'â€”'}</td></tr>`).join('');
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

/* â”€â”€ NOVOS Mà “DULOS: CAMPAIGNS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
    <td>${esc(c.type || 'â€”')}</td>
    <td><span class="badge badge-${c.status}">${statusMap[c.status] || c.status}</span></td>
    <td>${c.start_date ? fmtDate(c.start_date) : 'â€”'}</td>
    <td>${c.end_date ? fmtDate(c.end_date) : 'â€”'}</td>
    <td style="text-align:right">${fmtCurrency(c.budget)}</td>
    <td style="text-align:right;white-space:nowrap">
      <button class="btn-icon" onclick="editCampaign('${c.id}')" title="Editar">âœŽ</button>
      <button class="btn-icon" onclick="deleteCampaign('${c.id}')" title="Excluir" style="color:var(--red)">âœ•</button>
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

/* â”€â”€ NOVOS Mà “DULOS: HUNTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
    if (tb) tb.innerHTML = (top || []).map(l => `<tr><td><strong>${esc(l.name)}</strong></td><td><span class="badge badge-${l.avg_score >= 70 ? 'active' : l.avg_score >= 40 ? 'in_progress' : 'pending'}">${parseFloat(l.avg_score || 0).toFixed(1)}</span></td><td>${l.enrichment_count || 0}</td><td style="text-align:right"><button class="btn-icon" onclick="navigate('leads')" title="Ver Lead">â†’</button></td></tr>`).join('');
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
    <td>${esc(e.lead_name || 'â€”')}</td>
    <td>${esc(e.source || 'â€”')}</td>
    <td>${e.score != null ? e.score : 'â€”'}</td>
    <td>${e.created_at ? fmtDate(e.created_at) : 'â€”'}</td>
    <td style="text-align:right"><button class="btn-icon" onclick="deleteEnrichment('${e.id}')" title="Excluir" style="color:var(--red)">âœ•</button></td></tr>`).join('');
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

/* â”€â”€ Colaboradores / Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function loadUsers() {
  try {
    const data = await api('GET', '/users');
    const users = data.users || [];
    const tbody = document.getElementById('users-tbody');
    const empty = document.getElementById('users-empty');
    if (!tbody) return;

    const search = (document.getElementById('user-search')?.value || '').toLowerCase();
    const filterRole = document.getElementById('user-filter-role')?.value || '';
    const filtered = users.filter(u => {
      const matchSearch = !search || (u.name || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search);
      const matchRole = !filterRole || u.role === filterRole;
      return matchSearch && matchRole;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    const roleLabels = { ceo: 'CEO', admin: 'Administrador', comercial: 'Comercial', developer: 'Developer', user: 'Usuà ¡rio' };
    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td><strong>${esc(u.name)}</strong></td>
        <td>${esc(u.email)}</td>
        <td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${u.role === 'ceo' ? 'var(--accent-dim);color:var(--accent)' : u.role === 'developer' ? 'var(--purple-dim);color:var(--purple)' : u.role === 'comercial' ? 'var(--blue-dim);color:var(--blue)' : u.role === 'admin' ? 'var(--green-dim);color:var(--green)' : 'var(--bg-hover);color:var(--text-secondary)'}">${roleLabels[u.role] || u.role}</span></td>
        <td>${esc(u.cargo) || 'â€”'}</td>
        <td>${esc(u.funcao) || 'â€”'}</td>
        <td>${u.active ? '<span style="color:var(--green)">â— Ativo</span>' : '<span style="color:var(--red)">â— Inativo</span>'}</td>
        <td>${fmtDate(u.created_at)}</td>
        <td style="text-align:right">
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px" onclick="editUser(${u.id})">Editar</button>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;color:var(--red)" onclick="deleteUser(${u.id}, '${esc(u.name)}')">Remover</button>
        </td>
      </tr>
    `).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function editUser(id) {
  try {
    const data = await api('GET', `/users/${id}`);
    const u = data.user;
    document.getElementById('modal-user-title').textContent = 'Editar Colaborador';
    document.getElementById('user-id').value = u.id;
    document.getElementById('user-name-input').value = u.name || '';
    document.getElementById('user-email-input').value = u.email || '';
    document.getElementById('user-password-input').value = '';
    document.getElementById('user-password-hint').style.display = '';
    document.getElementById('user-role-input').value = u.role || 'comercial';
    document.getElementById('user-active-input').value = u.active ? '1' : '0';
    document.getElementById('user-cargo-input').value = u.cargo || '';
    document.getElementById('user-funcao-input').value = u.funcao || '';
    openModal('modal-user');
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteUser(id, name) {
  if (!confirm(`Remover o colaborador "${name}"?`)) return;
  try {
    await api('DELETE', `/users/${id}`);
    toast('Colaborador removido', 'success');
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

document.getElementById('btn-new-user')?.addEventListener('click', () => {
  document.getElementById('modal-user-title').textContent = 'Novo Colaborador';
  document.getElementById('user-id').value = '';
  document.getElementById('user-name-input').value = '';
  document.getElementById('user-email-input').value = '';
  document.getElementById('user-password-input').value = '';
  document.getElementById('user-password-hint').style.display = 'none';
  document.getElementById('user-role-input').value = 'comercial';
  document.getElementById('user-active-input').value = '1';
  document.getElementById('user-cargo-input').value = '';
  document.getElementById('user-funcao-input').value = '';
  openModal('modal-user');
});

document.getElementById('modal-user-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  const body = {
    name: document.getElementById('user-name-input').value,
    email: document.getElementById('user-email-input').value,
    role: document.getElementById('user-role-input').value,
    cargo: document.getElementById('user-cargo-input').value || null,
    funcao: document.getElementById('user-funcao-input').value || null,
    active: parseInt(document.getElementById('user-active-input').value),
  };
  const password = document.getElementById('user-password-input').value;
  if (password) body.password = password;
  if (!id && !password) { toast('Senha é obrigatória para novos colaboradores', 'error'); return; }

  try {
    if (id) {
      await api('PATCH', `/users/${id}`, body);
      toast('Colaborador atualizado', 'success');
    } else {
      await api('POST', '/users', body);
      toast('Colaborador criado', 'success');
    }
    closeModal('modal-user');
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
});

document.getElementById('btn-refresh-users')?.addEventListener('click', loadUsers);
document.getElementById('user-search')?.addEventListener('input', loadUsers);
document.getElementById('user-filter-role')?.addEventListener('change', loadUsers);

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
  if (page === 'routines') loadRoutines();
  if (page === 'users') loadUsers();
  setTimeout(() => addExportButtons(page), 100);
};

/* â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function esc(s) {
  const div = document.createElement('div');
  div.textContent = s ?? '';
  return div.innerHTML;
}

function fmtDate(d) {
  if (!d) return 'â€”';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  } catch { return d; }
}

function copyText(t) {
  navigator.clipboard.writeText(t).then(() => toast('Copiado!', 'success')).catch(() => toast('Erro ao copiar', 'error'));
}

function fmtCurrency(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return 'â€”';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

/* â”€â”€ Event Listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* â”€â”€ Sidebar Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Topbar Search â†’ focus sidebar search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const topbarSearch = document.getElementById('global-search-topbar');
if (topbarSearch) {
  topbarSearch.addEventListener('focus', () => {
    const sidebarSearch = document.getElementById('global-search');
    if (sidebarSearch && window.innerWidth > 768) {
      sidebarSearch.focus();
      topbarSearch.blur();
    }
  });
  // Keyboard shortcut: Ctrl+K â†’ focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const ss = document.getElementById('global-search');
      if (ss) ss.focus();
    }
  });
}

/* â”€â”€ Dev/Suporte group toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
on('btn-dev-suporte', 'click', () => {
  const children = document.getElementById('dev-suporte-children');
  const arrow = document.querySelector('#btn-dev-suporte .nav-group-arrow i');
  if (children) {
    children.classList.toggle('open');
    if (arrow) arrow.style.transform = children.classList.contains('open') ? 'rotate(0deg)' : 'rotate(-90deg)';
  }
});
// Start closed
const devChildren = document.getElementById('dev-suporte-children');
if (devChildren) devChildren.classList.remove('open');
const devArrow = document.querySelector('#btn-dev-suporte .nav-group-arrow i');
if (devArrow) devArrow.style.transform = 'rotate(-90deg)';

on('btn-logout', 'click', logout);

on('login-form', 'submit', async (e) => {
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

/* â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

(async function init() {
  // Init AOS for scroll animations
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 600,
      easing: 'ease-out-expo',
      once: true,
      offset: 80,
      disable: 'mobile',
    });
  }

  // Register GSAP ScrollTrigger if available
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

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
