# Arquitetura de implementação — Gestão de Atividades de Arquitetura

**Versão:** 1.0
**Status:** Aceito para implementação do MVP (T01)
**Data:** 2026-09-10
**Consulta de versões no npm/GitHub:** 2026-09-10
**Documentos de origem:** [PRD v1.0](prd.md), [Tech Spec v1.0](techspec.md), [Tasks](tasks.md)
**ADRs desta task:** [docs/adr/](adr/README.md)

Este documento consolida a arquitetura aprovada e as escolhas de ferramentas que a Tech Spec deixou em aberto. Não reabre as decisões de 10/09/2026 nem os ADR-012 e ADR-013.

---

## 1. Decisões aprovadas (não reabrir)

| # | Decisão |
| --- | --- |
| 1 | Next.js App Router com TypeScript |
| 2 | Prisma + PostgreSQL |
| 3 | Serviços de aplicação compartilhados; domínio não conhece Next, Prisma nem SDK OIDC |
| 4 | Server Actions para mutações |
| 5 | Route Handlers para autenticação, CSV e SSE |
| 6 | Tailwind CSS |
| 7 | OIDC agnóstico ao IdP (Logto DEV/TEST, CyberArk PROD); identidade normalizada; nunca claims brutos no domínio |
| 8 | Docker Compose local: apenas app + PostgreSQL (sem IdP local) |
| 9 | SSE + LISTEN/NOTIFY + `RealtimeEvent` + `Last-Event-ID` + retenção de 7 dias |
| 10 | Optimistic locking |
| 11 | Exportação CSV UTF-8 com BOM (sem XLSX neste MVP) |
| 12 | GitHub Actions; homologação Vercel; produção Kubernetes |

O detalhe de bibliotecas e versões é o objeto desta task. ADRs novos começam em **ADR-014**, em continuidade com ADR-012 e ADR-013 da Tech Spec.

Fora do MVP: RBAC sofisticado, SDKs de Logto/CyberArk no domínio, importador genérico, XLSX, views salvas.

---

## 2. Diagrama de camadas

```text
                         OIDC (discovery)
                 ┌────────────┴────────────┐
                 │                         │
            Logto Cloud                CyberArk
             DEV / TEST                  PROD
                 │                         │
                 └────────────┬────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js App Router                                              │
│                                                                 │
│  UI (RSC + Client Components, Tailwind)                         │
│           │                                                     │
│           ▼                                                     │
│  Borda HTTP                                                     │
│  ├── Server Actions ………… mutações (Zod → command)              │
│  ├── RSC / query functions … leituras (query)                   │
│  └── Route Handlers ………… /api/auth, /api/reports/csv, /api/sse │
│           │                                                     │
│           │  AuthenticatedIdentity (nunca claims brutos)        │
│           ▼                                                     │
│  Application services  (commands + queries)                     │
│           │  portas (interfaces de repositório)                 │
│           ▼                                                     │
│  Adapters / repositories                                        │
│  ├── Prisma Client (CRUD, transações, versões)                  │
│  ├── OIDC Auth Adapter (Auth.js + claim mapper)                 │
│  ├── CSV encoder                                                │
│  └── Realtime hub (LISTEN/NOTIFY + SSE) — T04 / T21             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                         PostgreSQL
                    Domain + User
                    AuditEvent
                    RealtimeEvent
                    LISTEN / NOTIFY
```

Fluxo de uma mutação:

```text
UI  →  Server Action
        1. exigir sessão e identidade normalizada
        2. validar entrada (Zod)
        3. chamar command do serviço de aplicação
        4. mapear ApplicationError / InfrastructureError
        5. revalidar cache / sinalizar realtime (após commit)
```

O domínio e os serviços de aplicação **não importam** `next`, `next/headers`, `@prisma/client`, `next-auth` nem SDKs de IdP. Essas dependências ficam na borda e em `src/infrastructure`.

---

## 3. Organização de código

Gerenciador de pacotes: **npm** (lockfile `package-lock.json` versionado). T05 pode trocar para pnpm somente se registrar o motivo; os nomes dos scripts abaixo permanecem.

```text
.
├── docs/                          # PRD, Tech Spec, tasks, arquitetura, ADRs, guias
├── prisma/
│   ├── schema.prisma              # T06
│   ├── migrations/                # Prisma Migrate
│   └── seed.ts
├── src/
│   ├── app/                       # apresentação + borda HTTP (Next.js)
│   │   ├── (auth)/                # login / logout UI
│   │   ├── (app)/                 # shell autenticado
│   │   │   ├── kanban/
│   │   │   ├── projects/
│   │   │   ├── dashboard/
│   │   │   ├── reports/
│   │   │   └── catalogs/
│   │   ├── actions/               # Server Actions (finas)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── reports/csv/route.ts
│   │   │   └── realtime/sse/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── domain/                    # tipos, invariantes, erros — zero I/O
│   │   ├── identity/
│   │   ├── activity/
│   │   ├── project/
│   │   ├── catalog/
│   │   ├── audit/
│   │   ├── calendar/              # tipos de dia/instante; regras de negócio em T02
│   │   └── errors.ts
│   ├── application/               # casos de uso (commands + queries)
│   │   ├── ports/                 # interfaces de repositório e relógio
│   │   ├── identity/
│   │   ├── activities/
│   │   ├── projects/
│   │   ├── catalogs/
│   │   ├── reports/
│   │   └── realtime/              # contrato de publicação (T21)
│   ├── infrastructure/
│   │   ├── auth/                  # Auth.js, OIDC adapter, claim mapper, sessão
│   │   ├── db/
│   │   │   ├── prisma.ts          # PrismaClient + adapter pg
│   │   │   └── repositories/
│   │   ├── csv/
│   │   ├── calendar/              # America/Sao_Paulo, limites de período
│   │   ├── realtime/              # hub; implementação T04/T21
│   │   └── composition.ts         # composição de serviços (composition root)
│   ├── ui/                        # componentes visuais reutilizáveis
│   │   ├── kanban/
│   │   ├── markdown/
│   │   ├── forms/
│   │   └── feedback/
│   └── config/
│       └── env.ts                 # validação de variáveis de ambiente
├── e2e/                           # Playwright
├── docker-compose.yml             # T05: app + postgres
└── package.json
```

### 3.1 Regras de dependência

| Camada | Pode depender de | Não pode depender de |
| --- | --- | --- |
| `domain` | apenas TypeScript / tipos próprios | Next, Prisma, Auth.js, React, `pg`, SDKs de IdP |
| `application` | `domain` + portas | Next, Prisma, Auth.js, claims OIDC, componentes UI |
| `infrastructure` | `domain`, `application` (portas), Prisma, `pg`, Auth.js | componentes React / rotas |
| `app` / `ui` | `application` via composition root, `ui`, Zod na borda | Prisma Client direto; claims brutos; SQL |

Módulos de servidor em `application` e `infrastructure` usam `import "server-only"` para não vazar para o bundle do cliente.

Alias de importação: `@/` → `src/`.

---

## 4. Acesso a dados e migrations

Prisma vive **somente** nos adapters/repositórios (`src/infrastructure/db`). Serviços de aplicação recebem portas:

```typescript
interface ActivityRepository {
  getById(id: string): Promise<Activity | null>
  updateWithVersion(input: UpdateActivity): Promise<Activity>
}
```

O Prisma Client é criado com o driver adapter oficial da linha 7 (`@prisma/adapter-pg` + `pg`). Não usar `prisma@latest` enquanto a linha 8 estiver em RC — ver [ADR-014](adr/ADR-014-orm-prisma.md).

### 4.1 Migrations

- Ferramenta: **Prisma Migrate** (`prisma migrate dev` no local; `prisma migrate deploy` em homologação/produção).
- Cada alteração de esquema (T06 em diante) gera migration versionada em `prisma/migrations`.
- Seeds idempotentes (domínios iniciais do PRD) em `prisma/seed.ts`.
- Homologação e produção **não** usam `db push` como fluxo padrão.
- T10 documenta o momento de aplicar migrations no deploy Vercel; T29 no Kubernetes.

### 4.2 Transações

Mutações auditáveis (T12) executam no mesmo `$transaction`:

1. atualizar entidade com predicado de versão;
2. gravar `AuditEvent`;
3. gravar `RealtimeEvent` (quando o hub existir — T21).

Falha em qualquer passo reverte tudo. `NOTIFY` ocorre **depois** do commit (T04/T21).

---

## 5. Contratos de leitura e mutação

Há dois contratos explícitos. Não há REST genérico de CRUD no MVP.

### 5.1 Queries (leitura)

- Executadas em Server Components, loaders ou funções `src/application/**/queries.ts`.
- Autorização no servidor em toda query (usuário autenticado e `isActive`).
- Não alteram estado. Não emitem auditoria nem realtime.
- Filtros temporais reutilizam o mesmo serviço de interseção (T19) no Kanban, dashboard e relatórios.
- Kanban consulta **estado atual**. Dashboard e relatórios consultam o **retrato no fechamento do período** (decisão 4 de 10/09; detalhe em T02).

### 5.2 Commands / Server Actions (mutação)

- Cada mutação tem um command com nome de intenção (`ChangeActivityStatus`, `CreateProject`, `Export` não é mutação).
- A Server Action é um adaptador fino: sessão → Zod → command → resultado.
- O command recebe `AuthenticatedIdentity` já resolvida para o usuário local (`LocalUser`), nunca o perfil Auth.js nem o token.
- Toda mutação relevante gera auditoria (T12) e, após T21, um `RealtimeEvent`.
- Optimistic locking: o cliente envia `version`; o servidor rejeita se estiver obsoleta.

### 5.3 Route Handlers (exceções HTTP)

| Rota (conceitual) | Uso | Task |
| --- | --- | --- |
| `/api/auth/*` | OIDC Authorization Code, callback, sessão, logout | T07 |
| `/api/reports/csv` | Download autenticado do relatório | T27 |
| `/api/realtime/sse` | Stream SSE autenticado + replay | T21 |

CSV e SSE não passam por Server Actions porque precisam de streaming / headers HTTP específicos.

---

## 6. Validação na borda

Biblioteca: **Zod 4.x** (tabela de versões na seção 17). Não há ADR próprio: a escolha é o validador TypeScript-first já usual no App Router, sem SDK de IdP.

- Schemas Zod vivem junto da borda (`src/app/actions` ou `src/application/**/schemas.ts` importáveis pela borda).
- A UI pode reutilizar o mesmo schema para mensagens de campo; a validação **autoritativa** é sempre no servidor.
- Serviços de aplicação assumem DTOs já parseados (`z.infer<typeof schema>`).
- Não validar claims OIDC no domínio: o mapper descarta o que não entra em `AuthenticatedIdentity`.
- Variáveis de ambiente são validadas na subida (`src/config/env.ts`) com os nomes da Tech Spec (`OIDC_*`, `AUTH_SECRET`, `APP_URL`, `DATABASE_URL`).

---

## 7. Tratamento de erros

Dois grupos. A borda é o único lugar que traduz para UI/HTTP.

### 7.1 Erros de aplicação

Falhas esperadas da regra ou do contrato, seguras para o usuário.

| Tipo | Quando | HTTP / UI |
| --- | --- | --- |
| `ValidationError` | Zod ou invariante de entrada | 400; erros por campo |
| `UnauthorizedError` | sem sessão | 401; redirecionar ao login |
| `ForbiddenError` | autenticado mas inativo / sem autorização | 403 |
| `NotFoundError` | recurso inexistente ou fora do escopo | 404 |
| `ConflictError` | versão obsoleta (optimistic lock) | 409; pedir recarregar |
| `InvariantError` | regra de negócio (ex.: cancelado é terminal) | 422 |

Essas classes vivem em `src/domain/errors.ts`. Commands as lançam. Não incluem stack de Prisma nem SQL.

### 7.2 Erros de infraestrutura

Falhas de banco, rede, IdP, disco, serialização inesperada.

- Encapsular em `InfrastructureError` (mensagem genérica ao usuário).
- Logar causa original **sem** tokens, cookies ou `client_secret`.
- Não vazar `PrismaClientKnownRequestError` para a UI.
- Falha ao gravar auditoria impede a mutação (T12); não há “salvar sem histórico”.

Server Actions retornam um resultado discriminado (`{ ok: true, data } | { ok: false, error }`) em vez de lançar erros de aplicação não tratados — o Next.js serializa exceções com cuidado variável. `ConflictError` deve chegar intacto ao Kanban (T18) para restaurar o card.

---

## 8. Autenticação e identidade

Detalhe: [ADR-015](adr/ADR-015-auth-js-oidc.md). Contrato OIDC e política: T03. Implementação: T07.

### 8.1 Adapter

Auth.js v5 (`next-auth` canal v5/beta) com **um único provedor genérico `type: "oidc"`**. O `id` do provedor é estável e neutro (ex.: `corporate`), nunca `logto` nem `cyberark`.

Configuração vem das variáveis da Tech Spec. Discovery via `{issuer}/.well-known/openid-configuration`. Endpoints manuais só se o discovery não estiver disponível.

Não há SDK de Logto ou CyberArk em nenhuma camada.

### 8.2 Identidade normalizada

O domínio conhece apenas:

```typescript
type AuthenticatedIdentity = {
  subject: string
  issuer: string
  email?: string
  displayName?: string
  groups?: string[]
}
```

`sub` + `iss` são a identidade primária. E-mail não identifica. Claims opcionais ausentes não bloqueiam autenticação.

O claim mapper (`src/infrastructure/auth/claim-mapper.ts`) é o único lugar que lê o perfil OIDC. Nenhuma regra de negócio acessa o token ou o objeto `Account` do Auth.js.

### 8.3 Usuário local e sessão

1. Authorization Code + PKCE.
2. Validação do ID Token / discovery.
3. Mapper → `AuthenticatedIdentity`.
4. Provisionar ou atualizar `User` por `UNIQUE(oidcIssuer, oidcSubject)` (T07).
5. Recusar se `isActive === false`.
6. Sessão em cookie HTTP-only (estratégia JWT do Auth.js). Persistir na sessão: `localUserId`, `issuer`, `subject`, `email`, `displayName`. Não persistir access token. `id_token` só se o logout OIDC (end_session) exigir.

Quem pode autenticar permanece no IdP. A aplicação confere sessão + `isActive` em páginas, actions, queries, CSV e SSE. Esconder botões na UI não é controle de acesso.

T03 define a política completa (incluindo usuário autenticado no IdP mas não autorizado). T01 apenas fixa o adapter e a fronteira da identidade.

---

## 9. Realtime (hub conceitual)

Implementação e prova: **T04** e **T21**. Aqui só o contrato que T05/T06 precisam respeitar.

```text
Command (transação)
  mutate + AuditEvent + RealtimeEvent
  COMMIT
  pg_notify('realtime', payload mínimo)

Route Handler SSE
  autenticar
  replay: RealtimeEvent.id > Last-Event-ID  (retenção 7 dias)
  se cursor expirado → instruir ressincronização
  LISTEN em conexão pg dedicada
  emitir eventos (id = RealtimeEvent.id)
```

Regras:

- Evento realtime nasce na **mesma transação** da mutação.
- `NOTIFY` só após commit; rollback não publica.
- `Last-Event-ID` é o id persistido, não um contador de conexão.
- Duplicatas no cliente são toleradas (idempotência de aplicação).
- Retenção: 7 dias. Cleanup é CronJob no Kubernetes (T29); não apaga `AuditEvent`.
- Prisma não substitui `LISTEN`: usar um `pg.Client` dedicado, fora do pool de queries. O adapter Prisma 7 já depende de `pg`, então não se adiciona outro driver.

T04 valida SSE em Vercel e no modelo de réplicas Kubernetes **antes** de fechar o desenho do hub. Se um runtime não suportar conexões longas, o ajuste fica documentado em T04 — não se troca SSE nesta task.

---

## 10. Optimistic locking

Campo `version` inteiro (começando em 1) nas entidades mutáveis cujo conflito silencioso seria danoso. No mínimo, a partir de T06/T12:

- Activity
- Project
- ValueDelivery (Entrega de Valor)
- Task list da atividade (ou a própria Activity, se as tarefas forem atualizadas no mesmo aggregate)

Padrão no repositório:

```text
UPDATE ... SET ..., version = version + 1
WHERE id = $id AND version = $expected
```

Zero linhas → `ConflictError`. A UI informa e recarrega. DnD (T18) usa o mesmo command de status (T14); conflito devolve o card à posição persistida.

Não usar `find` + `update` sem o predicado de versão.

---

## 11. CSV

Route Handler autenticado (T27). Sem XLSX.

| Aspecto | Decisão |
| --- | --- |
| Encoding | UTF-8 com BOM (`U+FEFF`) |
| Separador | `;` (Excel em pt-BR) |
| Campos | aspas duplas; aspas internas duplicadas |
| Quebra de linha | CRLF |
| Fórmulas | prefixar com `'` células que começam com `=`, `+`, `-`, `@`, tab ou CR |
| Datas de calendário | `YYYY-MM-DD` (dia em America/Sao_Paulo) |
| Instantes de auditoria | ISO-8601 UTC |
| Conteúdo | **toda** a seleção filtrada, não a página da UI |
| Autorização | mesma da consulta do relatório |

A implementação do encoder fica em `src/infrastructure/csv` (sem planilha). Colunas exatas são T27.

---

## 12. UI, DnD e Markdown

### 12.1 UI

- Tailwind CSS 4.x no App Router.
- Componentes em `src/ui`, sem design system externo no MVP.
- Layout para desktop/notebook; navegação por teclado (T08).
- Formulários mostram erros junto aos campos.
- Ícones: `lucide-react` (opcional, leve). Sem biblioteca de charts obrigatória até T26.

### 12.2 Drag and drop

[ADR-016](adr/ADR-016-dnd-kit.md): **@dnd-kit** (linha `core` 6.3.x).

- Arrastar entre colunas chama o command `ChangeActivityStatus` (T14).
- Não há ranking persistido entre cards no MVP (T18).
- Sempre haver alternativa por teclado/formulário (acessibilidade).
- A biblioteca não conhece o domínio: o handler da UI traduz coluna → status e envia `version`.

### 12.3 Markdown

[ADR-017](adr/ADR-017-markdown-seguro.md).

- Persistência: string Markdown, nunca HTML.
- Visualização: `react-markdown` + `remark-gfm` + **`rehype-sanitize`** (único pipeline seguro).
- Edição: `@uiw/react-md-editor` com o mesmo `rehype-sanitize` no preview.
- HTML/scripts e URLs perigosas não executam. Teste de XSS faz parte de T23/T28.

---

## 13. Datas e fuso (implementação técnica)

Regras de negócio (semana, interseção, retrato histórico) são **T02**. Aqui só o mecanismo: [ADR-019](adr/ADR-019-datas-fuso.md).

| Conceito | Tipo técnico | Uso |
| --- | --- | --- |
| Dia de planejamento | `Temporal.PlainDate` | início, previsão, conclusão, data de referência |
| Instante de auditoria | `Temporal.Instant` | `createdAt` / `updatedAt` / eventos |
| Limite de período | `Temporal.ZonedDateTime` | início/fim de semana, mês, trimestre, ano |

Fuso da aplicação: **`America/Sao_Paulo`**. PostgreSQL armazena instantes em `TIMESTAMPTZ` (UTC). Datas civis são `DATE` (sem hora). Conversão de “hoje” e de atalhos de período usa sempre o fuso da aplicação, nunca o fuso do processo Node nem o do browser.

Polyfill `@js-temporal/polyfill` no servidor (Node 24 LTS ainda não habilita Temporal nativo) e no cliente quando necessário. Constante única `APP_TIME_ZONE = "America/Sao_Paulo"`.

---

## 14. Testes

[ADR-018](adr/ADR-018-testes.md).

| Camada | Ferramenta | O que testar |
| --- | --- | --- |
| Unitário | Vitest | mapper OIDC, encoder CSV, limites de período, transições/invariantes (após T02), optimistic lock (versão), sanitização Markdown |
| Integração | Vitest + PostgreSQL de teste | repositórios, unicidade issuer+subject, transação auditoria+mutação, conflito de versão |
| E2E | Playwright | login, projeto → atividade → Kanban → CSV; autorização direta; conflito visível |

Não testar detalhes de implementação do Next nem snapshots frágeis de CSS. Priorizar regras, autorização, integridade, temporalidade e concorrência (critério comum das tasks).

Testes de domínio não sobem servidor Next. Testes de repositório não importam Server Actions.

---

## 15. Comandos esperados

Scripts npm (T05 cria os executáveis). Homólogos pnpm: `pnpm <script>`.

| Script | Comando previsto | Função |
| --- | --- | --- |
| `dev` | `next dev` | desenvolvimento local |
| `build` | `next build` | build de produção |
| `start` | `next start` | servir o build |
| `lint` | `eslint .` | lint (Next 16 não usa `next lint` como fluxo principal) |
| `typecheck` | `tsc --noEmit` | verificação de tipos |
| `test` | `vitest run` | unitário + integração |
| `test:watch` | `vitest` | modo watch |
| `test:e2e` | `playwright test` | E2E |
| `db:generate` | `prisma generate` | gerar client |
| `db:migrate` | `prisma migrate deploy` | aplicar migrations (CI/homolog/prod) |
| `db:migrate:dev` | `prisma migrate dev` | criar/aplicar no local |
| `db:seed` | `prisma db seed` | seeds idempotentes |
| `db:studio` | `prisma studio` | inspeção local opcional |

CI (T10) deve falhar o PR se `lint`, `typecheck`, `test` ou `build` falharem.

Ambiente local previsto (T05): `docker compose up` com `app` + `postgres`. Autenticação contra Logto Cloud.

---

## 16. Estratégia de branches

**GitHub Flow.**

1. `main` é a branch protegida: sem push direto; PR obrigatório; CI verde (`lint`, `typecheck`, `test`, `build`) antes do merge.
2. Trabalho em `feature/<task>-<slug>` (ex.: `feature/t13-activity-form`) a partir de `main`; PR para `main`; squash merge para histórico linear.
3. Commits [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, com escopo opcional da task (`feat(t14): preserve start date on reopen`). Homologação Vercel acompanha `main` (e previews de PR). Produção Kubernetes publica a partir de `main` (tag opcional em T29).

Não usar Git Flow (`develop` / `release` / `hotfix` obrigatórios). Hotfix é um `fix/` curto contra `main`.

---

## 17. Bibliotecas e versões alvo

Consulta ao registro npm em **2026-09-10**. T05 deve piná-las no `package.json` (faixa `major.minor` abaixo + patch mais recente da linha estável) e **reconsultar o npm** no dia da implementação. Não instalar canary/RC como padrão.

| Pacote | Versão alvo | Propósito |
| --- | --- | --- |
| `next` | **16.3.x** (estável 16.3.4 em 10/09/2026) | App Router, RSC, Server Actions, Route Handlers |
| `react` / `react-dom` | **19.x** alinhado ao Next 16.3 (19.3.0 no npm; seguir o pin do `create-next-app`) | UI |
| `typescript` | linha suportada pelo Next 16.3 (5.9+ / 6.x). **Não forçar TypeScript 7** se o Next 16.3 ainda não o suportar | tipos |
| `node` (runtime) | **24 LTS** (Active LTS em 10/09/2026); mínimo 22 LTS | Docker, CI, Vercel |
| `postgres` (imagem) | **17** | Compose e referência de homologação |
| `prisma` / `@prisma/client` / `@prisma/adapter-pg` | **7.10.x** (estável; **não** `prisma@latest` = 8 RC) | ORM, Migrate, client |
| `pg` | **8.23.x** | driver PostgreSQL + LISTEN |
| `next-auth` | **5.0.0-beta.32+** (canal `@beta` / v5) | OIDC genérico, sessão, Route Handlers |
| `zod` | **4.5.x** (4.5.4 em 10/09/2026) | validação na borda e env |
| `tailwindcss` + `@tailwindcss/postcss` | **4.3.x** (4.3.3 em 10/09/2026) | CSS |
| `eslint` + `eslint-config-next` | ESLint **10.x**; `eslint-config-next` **16.3.x** | lint |
| `@dnd-kit/core` | **6.3.x** (6.3.1) | DnD do Kanban |
| `@dnd-kit/sortable` | **10.0.x** (peer `core ^6.3.0`) | colunas / checklist |
| `@dnd-kit/utilities` | **3.2.x** | helpers DnD |
| `react-markdown` | **10.1.x** | renderização Markdown |
| `remark-gfm` | **4.0.x** | GFM (listas, tabelas) |
| `rehype-sanitize` | **6.0.x** | sanitização XSS |
| `@uiw/react-md-editor` | **4.1.x** | editor Markdown |
| `@js-temporal/polyfill` | **0.5.x** | datas/fuso |
| `vitest` | **5.0.x** | testes unitários/integração |
| `@testing-library/react` | **16.3.x** | testes de componente, se necessário |
| `@playwright/test` | **1.63.x** | E2E |
| `lucide-react` | **1.44.x** (1.44.0 no npm em 10/09/2026) | ícones opcionais |
| `server-only` | **0.0.1** | barreira de bundle |
| `dotenv` | **17.x** | env local / Prisma CLI |

Pin em T05: gravar versões exatas no lockfile. Se uma linha minor tiver patch de segurança no dia de T05, preferir o patch. Se Prisma 8 estiver **estável** e documentado para PostgreSQL + Migrate no dia de T05, a mudança exigiria um ADR novo — o padrão do MVP permanece 7.10.x.

---

## 18. Ambientes (resumo)

| Ambiente | Runtime | Banco | IdP |
| --- | --- | --- | --- |
| Local | Docker Compose (`app` + `postgres`) | PostgreSQL no Compose | Logto Cloud |
| Homologação | Vercel | PostgreSQL do ambiente | Logto Cloud |
| Produção | Kubernetes (réplicas Next.js) | PostgreSQL gerenciado | CyberArk |

A mesma implementação OIDC nos três. Só mudam issuer, credenciais e mapper se o provedor exigir.

---

## 19. Fora desta task

T01 **não** cria a aplicação Next.js (T05), o schema Prisma (T06), o guia OIDC (T03), a prova de realtime (T04) nem os demais guias em `docs/guides/` além do [índice](guides/README.md).

---

## 20. Riscos que T05/T06 devem respeitar

1. **`prisma@latest` aponta para 8 RC** (10/09/2026). Instalar `prisma@7.10.x` / `prisma@7`.
2. Prisma 7 exige `@prisma/adapter-pg` + `pg`; `new PrismaClient()` sem adapter falha.
3. Auth.js v5 instala-se pelo canal **beta** (`next-auth@5` / `@beta`), não `next-auth@latest` (v4).
4. Provedor Auth.js com id genérico; zero condicionais `logto`/`cyberark` fora do mapper.
5. Schema `User`: `UNIQUE(oidcIssuer, oidcSubject)`; e-mail não é chave.
6. Conexão `LISTEN` dedicada (`pg.Client`), separada do pool Prisma.
7. `version` nas entidades mutáveis desde T06; T12 não deve “adicionar depois” sem coluna.
8. `DATE` para dias civis; `TIMESTAMPTZ` para auditoria/realtime. Nunca gravar dia de planejamento como instante UTC sem fuso.
9. Segredos só em env / secret store; `.env` fora do git (T05).
10. TypeScript: usar a versão que o Next 16.3 aceitar; não pular para TypeScript 7 sem verificar o build.
