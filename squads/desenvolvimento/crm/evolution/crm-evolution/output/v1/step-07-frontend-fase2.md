# Step 07 — Phase 2 Frontend

**Agent:** Juliana Martins (Frontend Developer)
**Label:** Fase 2: Frontend — Charts, Notificações, Upload, Export

## Completed

### Charts (Chart.js) ✅
- Chart.js v4.4.7 via CDN
- Leads por mês (gráfico de barras) no dashboard
- Pipeline por estágio (gráfico doughnut) no dashboard
- Charts carregam na função loadDashboard via `renderCharts()`

### Notificações ✅
- Sino de notificações na topbar com badge de não lidas
- Dropdown de notificações com "Marcar todas lidas"
- Polling de contagem de não lidas no loadDashboard
- Click outside fecha dropdown

### Upload de Arquivos ✅
- Input de arquivo nos modais de lead, company, deal
- Lista de anexos com download e delete
- Upload via FormData + fetch
- Ícones de ação (⬇ download, ✕ delete)

### Export CSV ✅
- Botão "📥 CSV" em todas as páginas (leads, companies, deals)
- Export via fetch + blob download
- Nome do arquivo baseado no endpoint

## Files Changed
- `public/index.html` — Chart.js CDN, notificação UI, upload inputs, charts canvases
- `public/css/theme.css` — notif-dropdown styles
- `public/js/app.js` — charts, notifications, upload, export logic
