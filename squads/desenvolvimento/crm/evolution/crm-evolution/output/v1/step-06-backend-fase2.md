# Step 06 — Phase 2 Backend

**Agent:** Fernando Costa (Backend Developer)
**Label:** Fase 2: Backend — Upload, Export, Notificações, Charts API

## Completed

### Task 2.1 — Upload de Arquivos ✅
- Created `src/services/file-service.js` — save, list, get, delete files
- Created `src/routes/files.js` — POST /api/upload, GET /api/files, GET /api/files/:id/download, DELETE /api/files/:id
- Created `uploads/` directory
- Installed `@fastify/multipart` (10MB limit)
- Tabela `attachments` no schema (lead_id, company_id, deal_id, filename, original_name, mime_type, size)

### Task 2.3 — Exportação CSV ✅
- Created `src/routes/export.js` — GET /api/leads/export, GET /api/companies/export, GET /api/deals/export
- Usa `csv-stringify/sync` para gerar CSV com header
- Content-Disposition para download automático

### Task 2.4 — Notificações ✅
- Created `src/services/notification-service.js` — CRUD de notificações
- Created `src/routes/notifications.js` — GET, unread-count, mark read, mark all read
- Tabela `notifications` no schema

### Task 2.2 — Charts API ✅
- Created `src/routes/dashboard.js` — GET /api/dashboard/charts
- Retorna leads_by_month, deals_by_stage, leads_by_status, funnel, pipeline_total

### Server Updates ✅
- `src/server.js` — registered multipart plugin + 4 new route modules
