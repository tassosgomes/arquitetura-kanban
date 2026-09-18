# Melhorias de UX do Kanban

Origem: revisão de UX da tela `/kanban` em 18/09/2026, sobre a base de teste com 47
atividades (25 no Backlog). Cada task abaixo é independente e tem aceite próprio;
a ordem da tabela é a ordem de maior retorno por esforço.

Escopo: somente a tela `/kanban`. Não altera regras de domínio, esquema, auditoria
nem contratos de aplicação — exceto KUX-02, que **reutiliza** `classifyDeadlineStatus()`
já existente sem modificá-la.

| # | Task | Problema que resolve | Prio | Complexidade |
| --- | --- | --- | --- | --- |
| [KUX-01](KUX-01-altura-board-scroll-coluna.md) | Altura fixa do board, scroll por coluna e header fixo | A coluna mais cheia estica a página e o board deixa de ser board | P0 | `low` |
| [KUX-02](KUX-02-sinal-de-prazo-no-card.md) | Sinal de prazo no card | Nenhum card indica atraso; regra já existe e não é usada | P0 | `low` |
| [KUX-03](KUX-03-mover-para-sob-demanda.md) | "Mover para" sob demanda | Select permanente consome ~35% da altura de 47 cards | P0 | `low` |
| [KUX-04](KUX-04-estado-de-filtro-visivel.md) | Estado de filtro visível e aplicação imediata | Filtro recolhido não diz o que está filtrando | P1 | `mid` |
| [KUX-05](KUX-05-legibilidade-do-card.md) | Legibilidade do título e poda de tags | Títulos truncados indistinguíveis; tags roubam espaço | P1 | `low` |
| [KUX-06](KUX-06-drop-target-inicial-teclado.md) | Corrigir alvo inicial do drag por teclado | Espaço na alça já destaca a coluna seguinte | P2 | `mid` |
| [KUX-07](KUX-07-busca-por-titulo.md) | Busca por título no board | 11 filtros de taxonomia e nenhum campo de texto | P2 | `mid` |
| [KUX-08](KUX-08-area-de-arraste.md) | Card arrastável e alvo de toque | Alça de 24px com `opacity-40`; card não arrasta | P2 | `low` |
| [KUX-09](KUX-09-prioridade-na-excecao.md) | Badge de prioridade só na exceção | Quase todo card é "Média": o badge não diferencia | P3 | `low` |

## Arquivos tocados por esta iniciativa

- `src/ui/kanban/KanbanBoard.tsx` — KUX-01, KUX-06, KUX-07
- `src/ui/kanban/KanbanCard.tsx` — KUX-02, KUX-03, KUX-05, KUX-08, KUX-09
- `src/ui/kanban/KanbanFilters.tsx` — KUX-04, KUX-07
- `src/ui/kanban/kanban-keyboard-coordinates.ts` — KUX-06
- `src/application/activities/kanban-board.ts` — KUX-02 (campo novo em `toKanbanCard`)
- `src/app/(app)/kanban/page.tsx` — KUX-04 (contador), KUX-07 (parse do termo)

## Critério comum de conclusão

- [ ] Verificações automatizadas existentes passam (`npm test`, lint, typecheck).
- [ ] Nenhuma regressão de acessibilidade: a rota por teclado e os anúncios de
      leitor de tela do board continuam funcionando como antes da mudança.
- [ ] Validado em tema claro e escuro (`docs/design/DESIGN-CLARO.md` / `DESIGN-ESCURO.md`).
- [ ] Validado com a massa de teste real (47 atividades), não só com estado vazio.
