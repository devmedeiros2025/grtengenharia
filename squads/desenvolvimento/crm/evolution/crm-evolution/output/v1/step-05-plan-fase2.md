# Step 05 — Phase 2 Plan: Melhorias CRM

**Agent:** Marcos Oliveira (Tech Lead)
**Label:** Fase 2: Planejamento — Melhorias CRM

## Objetivo
Implementar 5 melhorias no CRM: Upload de arquivos, Kanban avançado, gráficos no dashboard, exportação CSV e notificações in-app.

## Plano Detalhado

### Task 2.1 — Upload de Arquivos
- **Backend**: 
  - Criar `src/services/file-service.js` — gerenciamento de uploads
  - Criar tabela `attachments` (id, lead_id, company_id, deal_id, filename, original_name, mime_type, size, created_at)
  - Rota `POST /api/upload` com `@fastify/multipart`
  - Rota `GET /api/files/:id` para download
  - Rota `DELETE /api/files/:id`
  - Servir arquivos de `./uploads/` via static
  - Zod schema para validação de upload
- **Frontend**:
  - Botão upload em modais de lead, company, deal
  - Lista de anexos com download/delete
  - Drag-and-drop upload zone

### Task 2.2 — Gráficos no Dashboard
- **Backend**: 
  - Rota `GET /api/dashboard/charts` — agrega dados para gráficos (leads por mês, deals por estágio, conversão)
- **Frontend**:
  - Adicionar Chart.js via CDN
  - Gráfico de leads por mês (barras)
  - Gráfico de pipeline por valor (pizza/donut)
  - Gráfico de conversão (funil)

### Task 2.3 — Exportação CSV
- **Backend**:
  - `GET /api/leads/export?format=csv` — retorna CSV
  - `GET /api/companies/export?format=csv`
  - `GET /api/deals/export?format=csv`
- **Frontend**:
  - Botões "Exportar CSV" nas páginas

### Task 2.4 — Notificações In-App
- **Backend**:
  - Criar tabela `notifications` (id, user_id, type, message, link, read, created_at)
  - Rota `GET /api/notifications` — listar
  - Rota `PATCH /api/notifications/:id/read` — marcar lida
  - Rota `POST /api/notifications` — criar (interna)
- **Frontend**:
  - Badge de notificações no topbar
  - Dropdown de notificações
  - Indicador visual de não lidas

### Task 2.5 — Kanban Aprimorado
- **Backend**: Já temos pipeline stages da API — adicionar ordenação drag-and-drop via `PATCH /api/deals/:id` com position
- **Frontend**: 
  - Animação suave entre colunas
  - Card preview com mais info (valor, contato, empresa)
  - Botão rápido "Adicionar negócio" em cada coluna

## Prioridade
1. Task 2.1 Upload → Fernando Costa (Backend) + Juliana Martins (Frontend)
2. Task 2.2 Gráficos → Juliana Martins
3. Task 2.3 Export CSV → Fernando Costa
4. Task 2.4 Notificações → Fernando + Juliana
5. Task 2.5 Kanban → Juliana Martins
6. QA Validation → Roberto Almeida
