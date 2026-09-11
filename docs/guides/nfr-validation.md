# Validação de fluxos integrados e requisitos não funcionais

**Task:** T28  
**Versão:** 1.0  
**Data:** 2026-09-10  
**Status:** Evidência de laboratório (Vitest + Playwright público). **Login SSO real não está validado.** Uso simultâneo pelos cinco integrantes e E2E autenticado dependem de Logto / homologação (T10) e da rotina em T30.  
**OIDC:** [oidc.md](oidc.md)  
**Local:** [local-development.md](local-development.md)  
**Homologação:** [homologation.md](homologation.md)  
**Realtime:** [realtime.md](../realtime.md), [realtime-validation.md](realtime-validation.md)  
**Testes:** [ADR-018](../adr/ADR-018-testes.md), [architecture.md §14](../architecture.md)

Este guia registra o que foi exercitado nesta task, as **metas escritas antes de medir**, e o que continua pendente de acesso externo. Não contém credenciais nem números inventados de produção.

Critério comum das tasks: nenhum item que depende de integração externa é marcado como validado só com mock. Por isso o Playwright **não** forja cookie Auth.js para fingir login.

---

## 0. Como usar

1. Rode as verificações da [§1](#1-comandos).
2. Leia o que passou sem IdP ([§2](#2-o-que-passou-sem-logto)) e o que o pipeline E2E cobre ([§3](#3-e2e-playwright)).
3. Confira realtime nas telas M4 ([§4](#4-realtime-nas-telas-m4)).
4. Use as [§5](#5-cinco-usuários-simultâneos)--[§7](#7-teclado-e-layout-checklist-manual) na homologação quando o login existir.
5. Não marque o aceite de T28 como “rotina diária pronta” enquanto o login real e os cinco usuários não tiverem sido exercitados.

---

## 1. Comandos

Com `DATABASE_URL` apontando para PostgreSQL 17 (Compose local ou o serviço da CI) e variáveis dummy de OIDC/AUTH aceitáveis para subir a app (não são login validado):

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium   # uma vez por máquina
npm run test:e2e                  # usa `.next/standalone` (o app declara `output: "standalone"`; `next start` não serve)
```

Se a porta 3000 já tiver um `next` antigo, use outra origem para não reutilizar o processo errado: `E2E_BASE_URL=http://127.0.0.1:3002 npm run test:e2e`.

`npm test` é Vitest (domínio, aplicação, integração Postgres). `npm run test:e2e` é Playwright (Chromium) contra o build **standalone** (`scripts/e2e-webserver.mjs`). Na CI, o job `e2e` faz migrate + build + Playwright. Localmente o Playwright reutiliza um servidor já no ar na `E2E_BASE_URL` ou sobe o standalone.

Issuer/client dummy **não** substituem o roteiro de [oidc.md](oidc.md).

---

## 2. O que passou sem Logto

Estes testes já existiam (T07–T27) ou foram acrescentados em T28. Todos usam usuário local persistido ou handlers injetados — **não** o Authorization Code do IdP.

| Tema | Onde | Resultado nesta task |
| --- | --- | --- |
| Autorização direta (sem sessão, inativo, 403) | `active-user-guard.test.ts`, CSV/SSE handlers, middleware | Passa. Middleware deixa `/api/*` chegar no handler para CSV/SSE responderem **401** (antes redirecionavam HTML de login). |
| Conflito de versão / duas edições | `audited-transaction.test.ts` | Passa (uma grava, a outra `ConflictError`, sem segundo evento de auditoria). |
| Auditoria atômica / rollback | `audited-transaction.test.ts`, realtime postgres | Passa (falha ao gravar auditoria reverte a mutação; rollback não dá `NOTIFY`). |
| Replay SSE / cursor expirado | `sse-handler.test.ts`, `realtime.postgres.test.ts` | Passa. |
| Markdown seguro (HTML, `javascript:`, handlers) | `markdown-sanitize.test.ts` | Passa. |
| Fluxo projeto → atividade → checklist → Kanban → entrega → CSV | `mvp-integrated-flow.postgres.test.ts` | Passa no Postgres de teste. Ator já provisionado; **não** há login OIDC. |
| Snapshot gerencial com 48 atividades | `management-snapshot-mass.postgres.test.ts` | Ver [§6](#6-consultas-com-massa). |

Login real, provisionamento no primeiro SSO e recusa pelo allowlist do IdP **não** entram nesta tabela.

---

## 3. E2E Playwright

`@playwright/test` **1.63.x**, Chromium, pasta `e2e/` (ADR-018).

| Spec | O que cobre | Aceite |
| --- | --- | --- |
| `e2e/public-routes.spec.ts` | `/login` (botão SSO e alerta `AccessDenied`), `/403`, redirect de `/kanban` `/dashboard` `/reports` `/projects` para `/login`, `GET /api/reports/csv` e `GET /api/realtime/sse` **sem** cookie → **401** e sem CSV/event-stream | Automatizado na CI |
| `e2e/authenticated-flow.spec.ts` | Roteiro login → projeto → atividade → checklist → Kanban → entrega → relatório/CSV | **Skipped** até OIDC real. Não reativar com sessão forjada. |

O clique em “Entrar com SSO” **não** é exercitado no spec público: o issuer dummy da CI não é um IdP. Isso evitaria um falso vermelho e também um falso aceite.

E2E autenticado na URL de homologação permanece o item T28 da tabela em [homologation.md §12](homologation.md#12-relação-com-outras-tasks), depois que as contas existirem.

---

## 4. Realtime nas telas M4

O `RealtimeProvider` vive em `src/app/(app)/layout.tsx` e envolve **todo** o conteúdo autenticado.

Páginas M4 conferidas (todas sob `(app)`, nenhuma fora do layout):

| Tela | Rota |
| --- | --- |
| Dashboard (T26) | `/dashboard` |
| Relatório e CSV (T27) | `/reports`, `/api/reports/csv` |
| Página do projeto (T24) | `/projects/[id]` e subrotas |
| Entregas de Valor (T23) | `/projects/[id]/value-deliveries…` |

Dashboard e relatórios já invalidam via o mesmo `router.refresh()` do board (T22). Não foi necessário mover página. SSE autenticado continua recusado sem sessão ([§3](#3-e2e-playwright)). Prova de SSE longo em Vercel/Kubernetes **não** está feita — [realtime-validation.md](realtime-validation.md).

---

## 5. Cinco usuários simultâneos

**Meta (antes de medir):** o PRD §26 pede boa performance para uma equipe de **5** pessoas; o §24 pede que os cinco usem a ferramenta como rotina. Não há SLA numérico de latência no PRD.

**Premissas (desenho, não medição):**

- Cinco sessões Auth.js + até cinco `EventSource` no hub do processo. O `LISTEN` PostgreSQL é **uma** conexão por processo Node; o fan-out é in-process ([realtime.md](../realtime.md)).
- Edições no mesmo card: optimistic locking já demonstra que uma gravação vence e a outra recebe conflito visível — isso é o comportamento correto, não um erro de carga.
- Cinco pessoas em atividades **diferentes** não compartilham a mesma `version` da linha; o gargalo esperado é I/O do Postgres e o número de streams SSE, não um lock global.
- Homologação Vercel: SSE **degradado** (teto de Function); reconexão + replay. Kubernetes (T29) é o alvo de SSE entre réplicas.

**O que não foi medido:** cinco browsers reais, cinco logins Logto, saturação de conexões, latência p95. **Não** inventar RPS nem tempo de página em produção.

**Quando medir:** depois do login em homologação, com os cinco integrantes (T30). Registrar data, URL, e se houve conflito/SSE visível — ainda sem transformar isso em benchmark de produto.

---

## 6. Consultas com massa

**Meta (registrada antes da medição; não é SLA de produção):**

| Item | Valor da meta |
| --- | --- |
| População | **48** atividades (8 em cada coluna do Kanban), recorte `THIS_MONTH` |
| Ambiente | PostgreSQL 17 do Vitest (CI ou `DATABASE_URL` local), mesmo processo Node dos testes |
| Sucesso funcional | `I-01` e `populationIds.length` iguais a 48 |
| Orçamento de tempo | `computeManagementSnapshot` **< 15 s** nesse ambiente |

Teste: `src/application/reports/management-snapshot-mass.postgres.test.ts` (cria via `createActivity`, com auditoria, para o retrato histórico existir).

**Medição desta task:**

| Ambiente | N | Tempo de `computeManagementSnapshot` | Resultado |
| --- | --- | --- | --- |
| PostgreSQL 17 local (Compose, 2026-09-10, esta máquina) | 48 | **78 ms** | 48 ids; I-01 = 48. Abaixo do orçamento de 15 s. **Não** extrapolar para produção. |
| CI GitHub Actions (`ubuntu-latest`, job `verify`) | 48 | copiar do log `T28 mass snapshot:` se o job já rodou no remoto | mesmo assert; o número varia com o runner |

Se o Postgres local não estiver no ar, o teste **pula** (exceto na CI, onde a ausência de banco falha). Tempo de CI varia com o runner — copiar o número do log, não estimar.

Volume “equipe de 5” no MVP é da ordem de dezenas a poucas centenas de atividades no ano, não milhares. Esta massa é **representativa do MVP**, não de um data warehouse.

---

## 7. Teclado e layout (checklist manual)

Automatizar isto exige sessão autenticada. Até o Logto existir, use o checklist abaixo em desktop (~1280 px, teto do `AppShell`) e notebook (~1366×768 ou janela ~1280×800).

Marque na homologação (data / quem / URL). Itens de código já presentes; **não** estão tidos como validados no uso real.

| # | Verificação | Onde | Status lab | Status com login real |
| --- | --- | --- | --- | --- |
| K1 | Skip link “Ir para o conteúdo” visível no primeiro Tab e leva a `#conteudo-principal` | `SkipLink` + `AppShell` | Código presente | Pendente |
| K2 | Nav principal (Kanban, Projetos, Dashboard, Relatórios, Cadastros) operável por Tab/Enter; `aria-current` na rota ativa | `AppNav` | Código presente | Pendente |
| K3 | Login: Tab no botão “Entrar com SSO”; 403: “Voltar ao login” | Playwright público + páginas | Público ok | SSO pendente |
| K4 | Kanban: alça com Espaço + setas; seletor “Mover para”; anúncios do DnD | `KanbanBoard` / `kanban-keyboard-coordinates` | Código presente | Pendente |
| K5 | Formulários (projeto, atividade, entrega): labels, submit, erro junto ao campo, `focus-visible` | padrões T08 | Código presente | Pendente |
| K6 | Dashboard e relatório: filtros e “Exportar CSV” alcançáveis por teclado; CSV ainda exige sessão (401 sem cookie) | T26/T27 + E2E | CSV 401 ok | Pendente |
| L1 | Layout não quebra o nav em notebook; board rola horizontalmente nas seis colunas | `max-w-[1280px]`, colunas `w-72` | Inspeção de código | Pendente |
| L2 | Dashboard: cards + sete distribuições legíveis ~1280 px, sem depender de mobile | T26 | Inspeção de código | Pendente |

Não há viewport mobile no MVP (PRD §26: desktop e notebook).

---

## 8. Falha corrigida nesta task

O middleware redirecionava **qualquer** path anônimo (exceto `/login` e `/403`) para o login, inclusive `/api/reports/csv`, `/api/realtime/sse` e as probes `/api/health/*`. Os handlers de CSV/SSE já devolviam 401; o E2E via HTTP nunca os via. T28 passa `/api/*` adiante. Páginas HTML sem cookie continuam indo para `/login`.

---

## 9. Aceite T28 (honesto)

| Critério da task | Estado |
| --- | --- |
| Fluxo login → projeto → … → CSV **validado** | **Parcial.** Camada de aplicação + CSV autenticado por ator local: sim. Login OIDC e o mesmo fluxo no browser: **não**. |
| Autorização, conflito, auditoria atômica, replay, Markdown seguro | **Passam** (testes já existentes + middleware/E2E de recusa). |
| Realtime nas telas M4 | **Coberto** pelo layout `(app)`; sem página M4 órfã. SSE em homolog/prod: pendente de acesso. |
| Metas de desempenho/massa registradas **antes** de medir | **Sim** ([§5](#5-cinco-usuários-simultâneos), [§6](#6-consultas-com-massa)). Cinco usuários reais: **não medido**. |
| Teclado e layout | Checklist pronto; validação humana **pendente** de sessão. |
| Sem falhas impeditivas para rotina diária no lab | Nenhuma falha de lint/typecheck/test/build conhecida nesta task. A rotina diária dos cinco **ainda depende** de Logto, homologação e T30. |

**Não declarar T28 como “MVP adotável”.** Declarar: laboratório verde para regras, integridade e rotas públicas; identidade corporativa e uso em equipe continuam dependências externas.

---

## 10. Dependências externas (o responsável providencia)

| Recurso | Para quê | Guia |
| --- | --- | --- |
| Aplicação Logto DEV (e TEST/homolog) | Login real, reativar `e2e/authenticated-flow.spec.ts`, checklist teclado | [oidc.md](oidc.md) |
| Projeto Vercel + Postgres de homologação | E2E na URL estável | [homologation.md](homologation.md) |
| Cinco integrantes disponíveis | Premissa de carga humana e rotina | T30 / [adoption.md](adoption.md) — guia escrito; sessão com pessoas reais **pendente** |

Nenhum secret neste arquivo. Placeholders `CHANGEME` / `<…>` nos outros guias.
