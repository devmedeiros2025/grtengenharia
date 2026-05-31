# Step 01 — Phase 1 Plan

**Agent:** Marcos Oliveira (Tech Lead)
**Label:** Fase 1: Planejamento — Infraestrutura

## Plano Detalhado — Fase 1

### Task 1.1 — Zod Validation
- Criar `src/validators/` com schemas para leads, companies, deals, tasks, webhooks
- Integrar nos route handlers

### Task 1.2 — Paginação Companies & Deals
- Seguir padrão de `lead-service.js` (page, limit, total, totalPages)

### Task 1.3 — Testes Unitários
- `lead-service.test.js` e `webhook-service.test.js` com `node:test`

### Task 1.4 — Loading States (Frontend)
- Spinner/skeleton em todas as páginas

### Task 1.5 — Paginação UI (Frontend)
- Controles Anterior/Próximo nas páginas

### Task 1.6 — Dark Mode
- CSS variables + toggle + localStorage

### Task 1.7 — Pipeline Stages da API
- Substituir DEAL_STAGES hardcoded

## Prioridade
1. Backend tasks (1.1, 1.2, 1.3) → Fernando Costa
2. Frontend tasks (1.4, 1.5, 1.6, 1.7) → Juliana Martins
3. QA Validation → Roberto Almeida
