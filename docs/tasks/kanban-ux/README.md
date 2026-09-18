# Melhorias de UX do Kanban

Origem: revisão de UX da tela `/kanban` em 18/09/2026, sobre a base de teste com 47
atividades (25 no Backlog). Cada task abaixo é independente e tem aceite próprio;
a ordem de cada tabela é a ordem de maior retorno por esforço.

A iniciativa tem duas ondas. A **onda 1** trata do board em si — densidade, sinal e
filtro. A **onda 2** trata do que o board manda fazer: o cadastro de atividade, revisto
no mesmo dia a partir do fluxo `/kanban → /activities/new`.

Escopo: telas `/kanban` e `/activities/new`. A onda 1 não altera regras de domínio,
esquema, auditoria nem contratos de aplicação — exceto KUX-02, que **reutiliza**
`classifyDeadlineStatus()` já existente sem modificá-la. A onda 2 toca a camada de
aplicação em dois pontos declarados (KUX-10 e KUX-11) e em nenhum deles cria caminho
de escrita paralelo nem contorna auditoria.

## Onda 1 — Board

| # | Task | Problema que resolve | Prio | Complexidade | Status |
| --- | --- | --- | --- | --- | --- |
| [KUX-01](KUX-01-altura-board-scroll-coluna.md) | Altura fixa do board, scroll por coluna e header fixo | A coluna mais cheia estica a página e o board deixa de ser board | P0 | `low` | ✅ `4be3b6e` |
| [KUX-02](KUX-02-sinal-de-prazo-no-card.md) | Sinal de prazo no card | Nenhum card indica atraso; regra já existe e não é usada | P0 | `low` | ✅ `01952ba` |
| [KUX-03](KUX-03-mover-para-sob-demanda.md) | "Mover para" sob demanda | Select permanente consome ~35% da altura de 47 cards | P0 | `low` | ✅ `8cb4c67` |
| [KUX-04](KUX-04-estado-de-filtro-visivel.md) | Estado de filtro visível e aplicação imediata | Filtro recolhido não diz o que está filtrando | P1 | `mid` | ✅ `28ce262` |
| [KUX-05](KUX-05-legibilidade-do-card.md) | Legibilidade do título e poda de tags | Títulos truncados indistinguíveis; tags roubam espaço | P1 | `low` | ✅ `4526307` |
| [KUX-06](KUX-06-drop-target-inicial-teclado.md) | Corrigir alvo inicial do drag por teclado | Espaço na alça já destaca a coluna seguinte | P2 | `mid` | ✅ `7a0e440` |
| [KUX-07](KUX-07-busca-por-titulo.md) | Busca por título no board | 11 filtros de taxonomia e nenhum campo de texto | P2 | `mid` | ✅ `df2fa6d` |
| [KUX-08](KUX-08-area-de-arraste.md) | Card arrastável e alvo de toque | Alça de 24px com `opacity-40`; card não arrasta | P2 | `low` | — |
| [KUX-09](KUX-09-prioridade-na-excecao.md) | Badge de prioridade só na exceção | Quase todo card é "Média": o badge não diferencia | P3 | `low` | — |

## Onda 2 — Cadastro de atividade

| # | Task | Problema que resolve | Prio | Complexidade | Status |
| --- | --- | --- | --- | --- | --- |
| [KUX-10](KUX-10-erros-do-cadastro-em-uma-rodada.md) | Erros do cadastro em uma única rodada | Submeter vazio devolve 2 de 7 erros; os outros 4 só na 2ª tentativa | P0 | `mid` | ✅ `703c3e2` |
| [KUX-11](KUX-11-criacao-rapida-pela-coluna.md) | Criação rápida pela coluna do board | 16 campos para registrar uma demanda que ainda não foi classificada | P0 | `mid` | ✅ `415fcf4` |
| [KUX-12](KUX-12-permanecer-no-board-apos-criar.md) | Permanecer no contexto depois de criar | Criar redireciona ao detalhe e abandona o board e seus filtros | P0 | `low` | — |
| [KUX-13](KUX-13-agrupamento-e-acao-fixa-no-cadastro.md) | Agrupar o formulário e fixar a ação primária | ~1.900px de coluna única, sem hierarquia, com o CTA fora da viewport | P1 | `mid` | ✅ `6855d71` |
| [KUX-14](KUX-14-selecao-de-pessoas-e-areas-por-busca.md) | Seleção de pessoas e áreas por busca | Grades de checkbox que renderizam o catálogo inteiro | P1 | `mid` | — |
| [KUX-15](KUX-15-fixtures-visiveis-nos-seletores.md) | Fixtures de teste visíveis nos seletores | `T12 actor` ×3 e um UUID como categoria em campos obrigatórios | P1 | `low` | ✅ `d3e0145` |
| [KUX-16](KUX-16-controles-de-escolha-curta.md) | Controles de escolha curta | 5 `<select>` para conjuntos de 2 a 4 opções curtas | P2 | `low` | — |
| [KUX-17](KUX-17-cadastro-em-painel-sobre-o-board.md) | Cadastro completo em painel sobre o board | Cadastrar continua custando perder o board de vista | P3 | `high` | — |

## Arquivos tocados por esta iniciativa

Onda 1:

- `src/ui/kanban/KanbanBoard.tsx` — KUX-01, KUX-06, KUX-07
- `src/ui/kanban/KanbanCard.tsx` — KUX-02, KUX-03, KUX-05, KUX-08, KUX-09
- `src/ui/kanban/KanbanFilters.tsx` — KUX-04, KUX-07
- `src/ui/kanban/kanban-keyboard-coordinates.ts` — KUX-06
- `src/application/activities/kanban-board.ts` — KUX-02 (campo novo em `toKanbanCard`)
- `src/app/(app)/kanban/page.tsx` — KUX-04 (contador), KUX-07 (parse do termo)

Onda 2:

- `src/ui/activities/ActivityForm.tsx` — KUX-10, KUX-12, KUX-13, KUX-14, KUX-16, KUX-17
- `src/ui/forms/FormField.tsx` — KUX-10, KUX-13
- `src/ui/forms/` (componentes novos) — KUX-14 (busca com chips), KUX-16 (segmentado)
- `src/application/activities/schemas.ts` — KUX-10
- `src/application/activities/assert-associations.ts` — KUX-10
- `src/ui/kanban/KanbanBoard.tsx` — KUX-11 (criação inline na coluna)
- `src/app/actions/activities.ts` — KUX-11 (reuso de `createActivityAction`)
- `src/app/(app)/kanban/page.tsx` — KUX-12 (destaque do card novo), KUX-17
- `src/app/(app)/activities/new/page.tsx` — KUX-17
- `src/infrastructure/db/*.test.ts` — KUX-15 (isolamento das fixtures)

## Ordem sugerida de execução

KUX-10 antes de KUX-11 e KUX-12: não faz sentido espalhar pontos de criação enquanto a
validação cobra o usuário em duas rodadas. KUX-13 antes de KUX-17: o painel só compensa
depois que o formulário couber nele. KUX-15 é independente e pode entrar a qualquer
momento — é o menor esforço da onda 2.

## Critério comum de conclusão

- [x] Verificações automatizadas existentes passam (`npm test`, lint, typecheck).
- [ ] Nenhuma regressão de acessibilidade: a rota por teclado e os anúncios de
      leitor de tela do board continuam funcionando como antes da mudança.
- [ ] Validado em tema claro e escuro (`docs/design/DESIGN-CLARO.md` / `DESIGN-ESCURO.md`).
- [ ] Validado com a massa de teste real (47 atividades), não só com estado vazio.
- [ ] Para a onda 2: o contrato do `FormData` enviado às actions não muda sem que a
      task diga explicitamente que muda, e a auditoria da atividade criada é idêntica
      independentemente do caminho de criação usado.

## Observações fora de escopo

Registradas na revisão, sem task própria por não serem decisões de UI:

- A coluna **"A fazer" está com 0 atividades** enquanto "Backlog" tem 25. Ou a etapa não
  é usada e o board tem uma coluna a mais, ou o fluxo pula dela direto para "Em
  andamento". É uma pergunta de processo para o time, não um ajuste de tela.
- O formulário de cadastro **não tem campo de checklist**, mas o card exibe progresso de
  checklist (`0/1`, `0/5`). O item nasce sem checklist e só ganha um no detalhe —
  vale confirmar se é intencional.
