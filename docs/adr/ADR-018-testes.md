# ADR-018 — Ferramentas de teste (Vitest + Playwright)

**Status:** Aceito
**Data:** 2026-09-10
**Task:** T01
**Consulta npm:** 2026-09-10

## Contexto

O plano exige testes que privilegiam regras de negócio, autorização, integridade, temporalidade e concorrência — não detalhes do Next. Precisamos de unitário rápido (domínio, mapper, CSV, calendário), integração com PostgreSQL (repositórios, transações, versões) e E2E dos fluxos (T28).

## Decisão

| Papel | Ferramenta | Versão alvo (10/09/2026) |
| --- | --- | --- |
| Unitário e integração | **Vitest 5.0.x** | 5.0.0 |
| Componentes (se necessário) | Testing Library (`@testing-library/react` 16.3.x) | junto do Vitest |
| E2E | **Playwright** `@playwright/test` **1.63.x** | Chromium no CI |

Princípios:

- Testes de `domain` e `application` não importam Next nem Prisma.
- Integração sobe PostgreSQL (Compose de teste ou container na CI) e usa Prisma Migrate no banco efêmero. Sem SQLite “compatível”.
- E2E cobre login, projeto → atividade → checklist → Kanban → relatório/CSV. OIDC pode usar IdP real de DEV ou fixture controlada; nunca marcar aceite de login como válido só com mock (critério comum das tasks).
- Conflito de versão: teste de integração com duas atualizações simultâneas (T12).
- Markdown XSS: teste do pipeline de sanitização (T23).
- `npm test` = Vitest; `npm run test:e2e` = Playwright. CI de PR (T10) roda lint, typecheck, Vitest e build; E2E completo entra no pipeline combinado em T28 (e pode ter job opcional antes).

## Consequências

- T05 configura `vitest.config.ts` e o script `test`.
- T06+ ganham testes de repositório no mesmo Vitest.
- Playwright não substitui testes de regra: retrato histórico (T25) é Vitest com fixtures, não só clique na dashboard.

## Alternativas consideradas

| Alternativa | Motivo de recusa |
| --- | --- |
| Jest | Mais lento no ecossistema Vite/Next 16; Vitest 5 está estável |
| Cypress | Playwright atende teclado, auth e download CSV com menos stack |
| Só E2E | Caro e frágil para calendário, auditoria e lock |
| SQLite nos testes de Prisma | Dialeto diferente; LISTEN/NOTIFY e tipos de data divergem |
