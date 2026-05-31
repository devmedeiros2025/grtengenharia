# Step 09 — Phase 3 Plan: Módulos GRT

**Agent:** Marcos Oliveira (Tech Lead)
**Label:** Fase 3: Planejamento — Equipamentos, OS, Contratos

## Task 3.1 — Equipamentos
- Tabela: id, nome, tipo, marca, modelo, placa, ano, status (disponivel/em_uso/manutencao), valor_diaria, foto, observacoes, created_at, updated_at
- CRUD completo + filtros por status/tipo
- Frontend: página própria com tabela + modal

## Task 3.2 — Ordens de Serviço
- Tabela: id, titulo, descricao, equipamento_id (FK), cliente_id (company FK), status (aberta/em_andamento/concluida/cancelada), prioridade (alta/media/baixa), data_abertura, data_conclusao, valor, observacoes, created_at
- CRUD completo + filtros por status/prioridade
- Frontend: página própria com tabela + modal

## Task 3.3 — Contratos
- Tabela: id, titulo, empresa_id (FK company), equipamento_id (FK), tipo (locacao/servico), valor, data_inicio, data_fim, status (ativo/encerrado/cancelado), observacoes, arquivo (filename), created_at, updated_at
- CRUD completo + filtros por status/tipo
- Frontend: página própria com tabela + modal + upload de arquivo
