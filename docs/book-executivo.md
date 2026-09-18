# Book executivo — status report por área

**Task:** T31 (pós-MVP)
**Versão:** 1.0
**Data:** 2026-09-17
**Status:** Implementado na branch `feat/book-executive`
**Referências:** [prd.md](prd.md) §§18–19 e §25; [domain-rules.md](domain-rules.md) §10.2 (retrato, DE-04, DE-05, DE-17, DE-19, DE-20); [tasks.md](tasks.md) T25–T27; [data-model.md](data-model.md)

Apresentação paginada por área da população já produzida por T25/T27. **Não é uma nova consulta**: reusa `loadManagementPopulation()` e o mesmo par período + filtros do dashboard e de `/reports`. O menu principal chama-se **Book** e abre `/reports/executive`. Não reabre as regras de retrato de T02.

`tasks.md` mantém "PDF executivo automático" fora do MVP (PRD §25). Este documento entrega a página HTML com CSS de impressão; geração de PDF no servidor permanece fora de escopo.

---

## 1. Origem dos dados

Tudo que o book mostra já existe:

| Bloco | Origem |
| --- | --- |
| Data base | `resolveTemporalQuery(...).fechamentoExclusivo` — mesma exibição de `ReportPeriodBanner` |
| População P | `loadManagementPopulation(actor, query, deps)` (`src/application/reports/compute-management-snapshot.ts`) |
| Dimensões das linhas | Retrato no fechamento (`ManagementReportRow`) |
| Título e descrição | Registro **atual** (`ActivityListItem`) — a auditoria não guarda esses campos |
| Checklist | Registro **atual** (`checklistDoneCount` / `checklistTotalCount`) |
| Indicadores da área | `snapshot.indicators` (I-01…I-09) e `snapshot.distributions` |
| Destaques da área | `ValueDelivery` dos projetos da área no período |
| Total de projetos da área | `projectRepository.list("all")` filtrado por `responsibleArea` |

O cabeçalho do book declara a mistura retrato × atual, como `/reports` já faz com `title`.

## 2. O que a imagem de referência pedia e não existe no modelo

Removido do layout, sem substituto inventado:

| Elemento | Motivo |
| --- | --- |
| **Risco** (coluna e "riscos críticos ativos") | não há campo de risco em nenhuma entidade |
| **Empresa** (cabeçalho) | não há entidade de empresa |
| **Descrição da área** | `Area` tem apenas `name`, `nameNormalized`, `isActive` |
| **Projetos priorizados** | `Project` não tem prioridade; prioridade é da atividade |
| **Custo operacional / consumo de recursos / desempenho da área (YTD)** | não há custo, consumo nem meta de desempenho |

O painel "Indicadores da área" é substituído por indicadores reais: I-01 (atividades no período), I-02 (concluídas), % de entregas no prazo (§4) e D-NATUREZA (Estratégica × Operacional).

## 3. Escopo e paginação — decisão aprovada

**O book cobre todas as áreas presentes em P. Os filtros apenas encolhem P; não existe controle de escopo próprio do book.**

- Filtros: o mesmo `DashboardFilters`, com `basePath="/reports/executive"`, e a árvore de áreas do catálogo. Uma página única é obtida setando `requestingArea`; esse filtro compara somente `portrait.areaSolicitanteId`.
- Paginação: uma página por área presente em P. Área sem atividade em P não gera página; não existem páginas vazias e `PÁGINA n/N` fica coerente com a sidebar.
- Ordem: alfabética pt-BR, igual a `bucketsFromCountMap` em `aggregate.ts`. Determinística e idêntica à sidebar.
- Canceladas entram, como já entram em I-09; aparecem com Status Prazo neutro e ficam fora do denominador de §4.

**Motivo:** "book" significa o conjunto inteiro. Um book de 3 páginas porque alguém esqueceu um filtro ligado é uma armadilha — quem recebe o arquivo não vê o filtro. Além disso, mesmos filtros → mesma P → os totais reconciliam com `/reports` e com o dashboard; escopo próprio quebraria essa garantia.

### 3.1 Área da página

Chave de agrupamento = `areaSolicitanteId` **do retrato**, uma linha por atividade.

Isso **difere de D-AREA**, que conta a atividade em todas as suas áreas (solicitante ∪ envolvidas, DE-19). A soma das páginas do book é igual a I-01; a soma de D-AREA não é. A divergência é intencional e exige nota de rodapé no book, no mesmo espírito de `CANONICAL_AREA_NOTE`.

Atividades com `areaSolicitanteId` ausente no retrato (`PORTRAIT_ABSENT`) vão para uma página final **"Sem área identificada"**, criada apenas se não estiver vazia. Nenhuma linha é descartada em silêncio — do contrário a soma das páginas deixaria de bater com I-01.

## 4. Status Prazo

Novo módulo `src/application/reports/deadline-status.ts`, com testes. `D` = data base (dia civil America/Sao_Paulo).

| Condição (avaliada nesta ordem) | Resultado |
| --- | --- |
| `previsaoTermino` ausente | Sem previsão |
| status = Cancelado | Cancelada |
| concluída e `dataConclusao ≤ previsaoTermino` | No prazo |
| concluída e `dataConclusao > previsaoTermino` | Concluída com atraso |
| não concluída e `previsaoTermino < D` | Atrasado |
| status ∈ {Backlog, A fazer} | Não iniciada |
| demais | No prazo |

```
% no prazo = No prazo ÷ (No prazo + Atrasado + Concluída com atraso)
```

O denominador exclui **Sem previsão** e **Cancelada**. O percentual sempre aparece acompanhado do denominador usado.

## 5. Checklist (a coluna que a referência chamava de "% Conclusão") — decisão aprovada

**Rótulo `Checklist`, valor `n/N`, barra apenas quando `N > 0`; "—" quando não há checklist. Concluída = 100%.**

Justificativa registrada: `% Conclusão` num book executivo é lido como "quanto do projeto andou", e isso não é medido em lugar nenhum — o que existe é a fração de itens de checklist marcados. O rótulo honesto evita que "0%" seja lido como "parado" quando significa "não preenchido". "Concluída = 100%" não é inferência: é identidade, a atividade tem `dataConclusao`.

Regra descartada: derivar percentual por faixa de status (Em andamento = 50% etc.). Inventa dado.

**Cobertura atual do dado.** Em `docs/massa-dados.normalizada.json` (47 atividades): 7 têm checklist, 40 não. O importador (`src/application/imports/import-test-data.ts:144`) cria tarefas via `addActivityTask` sem `isDone`, logo todas nascem não concluídas. Hoje a coluna renderiza 11 linhas em 100% (concluídas), 7 em 0/N e 29 em "—".

Isso é lacuna de **uso**, não de modelo: `ActivityTask.isDone` e `checklistProgress()` funcionam. A coluna melhora sozinha quando a equipe marcar itens, sem mudança de código.

O sinal de progresso com cobertura de 100% das linhas fica por conta de **Status + Status Prazo + distribuição de status no resumo da área**.

## 6. Layout da página de área

```
┌ cabeçalho: título · data base · PÁGINA n/N ─────────────────────┐
├ sidebar        │ nome da área                                   │
│  áreas (n)     │ ┌ Destaques da área (omitido se vazio) ───────┐ │
│                │ └────────────────────────────────────────────┘ │
│                │ tabela de atividades                           │
│                │ ┌ Legenda ┬ Resumo da área ┬ Indicadores ────┐ │
└────────────────┴─┴─────────┴────────────────┴─────────────────┴─┘
```

Colunas da tabela: **Projeto · Atividade / Descrição · Prioridade · Status · Status Prazo · Checklist · Previsão de Término · Responsável**.

- Projeto: `portrait.projetoId` → `labels.projects`; `AD_HOC` → "Ad hoc".
- Destaques da área: títulos e datas de referência das `ValueDelivery` dos projetos daquela área no período. **Bloco omitido quando não houver nenhuma** — decisão aprovada.
- Resumo da área: total de projetos, total de atividades e distribuição por status (contagem + %).
- Indicadores da área: os quatro de §2.

## 7. Task T31

- **Complexidade:** `mid` — apresentação sobre agregação pronta; a dificuldade está na regra de prazo e na consistência com D-AREA.
- **Dependências:** T25, T26, T27.
- **Escopo:** book paginado por área sobre a população de T25, com os mesmos filtros de `/reports`; regra de Status Prazo; CSS de impressão A4 paisagem.

### 7.1 Fases

**F1 — encanamento**
- `description` em `ActivityListItem` (`src/application/activities/types.ts`), no `select` de `prisma-activity-repository.ts` e em `mapListItem`.
- `listByProjectIds(ids)` em `ValueDeliveryRepository`.

**F2 — aplicação**
- `src/application/reports/deadline-status.ts` — regra de §4 + rótulos + testes.
- `src/application/reports/executive-book.ts` — `buildExecutiveBook(actor, query, deps)` → `ExecutiveBook { dataBase, areas: AreaPage[], geral }`, com testes próprios.

**F3 — UI**
- `src/app/(app)/reports/executive/page.tsx`, reusando `DashboardFilters`.
- `src/ui/reports/executive/`: `BookAreaPage`, `BookSidebar`, `BookLegend`, `AreaSummary`, `AreaIndicators`, `DeadlineBadge`.
- CSS de impressão: `@page { size: A4 landscape }`, `break-after: page` por área.

**F4 — integração**
- Botão "Book executivo" ao lado de "Exportar CSV" em `src/app/(app)/reports/page.tsx`.
- E2E: rota protegida e fluxo autenticado atualizado para o menu Book; cobertura de domínio inclui uma atividade por bucket de Status Prazo.

### 7.2 Aceite

- A soma das atividades de todas as páginas é igual a I-01 para os mesmos filtros.
- Book, `/reports` e dashboard concordam nos indicadores para o mesmo recorte.
- Nenhuma linha some: atividade sem área no retrato aparece em "Sem área identificada".
- Status Prazo cobre os seis buckets, e o % no prazo declara seu denominador.
- Checklist mostra "—" sem checklist e nunca 0% para ausência de dado.
- Nenhum bloco exibe risco, custo, consumo de recursos ou descrição de área.
- Impressão em A4 paisagem quebra exatamente uma área por página.
