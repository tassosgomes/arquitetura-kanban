# Homologação (Vercel)

**Task:** T10  
**Versão:** 1.0  
**Status:** Procedimento para o responsável. **Nenhum deploy real foi feito nesta task.** Contas Vercel, PostgreSQL de homologação e aplicação Logto de homologação são **dependências externas**, não validações concluídas.  
**OIDC:** [oidc.md](oidc.md) §3  
**Local:** [local-development.md](local-development.md) — **não** copiar o `.env` local para a Vercel  
**Realtime:** [realtime.md](../realtime.md) — homologação = SSE **degradado**  
**Arquitetura:** [architecture.md](../architecture.md)

Este guia descreve o que criar **fora do repositório**: projeto Vercel, banco, variáveis, callbacks Logto, momento das migrations e como recuperar um deploy. Não contém credenciais. Use os placeholders `CHANGEME` e `<…>`.

O ambiente **Production da Vercel neste projeto é a homologação do MVP**, não a produção Kubernetes (T29 / CyberArk).

---

## 0. Como usar este guia

1. O responsável cria as contas e recursos da [§1](#1-pré-requisitos-externos-o-responsável-providencia).
2. Configure o projeto Vercel e o PostgreSQL ([§2](#2-projeto-vercel) e [§3](#3-postgresql-de-homologação)).
3. Preencha as variáveis só no painel Vercel ([§4](#4-variáveis-por-ambiente)).
4. Confirme o GitHub Actions ([§5](#5-github-actions)) e o [fluxo de entrega](#6-fluxo-de-deploy).
5. Registre callbacks Logto na URL **estável** ([§8](#8-callbacks-logto)).
6. Execute o [roteiro de validação](#10-roteiro-de-validação) **depois** que as contas existirem. Enquanto não existirem, **não** marque login nem banco como validados.

Nunca cole secrets em issue, PR, este arquivo ou logs.

---

## 1. Pré-requisitos externos (o responsável providencia)

Nada disto é assumido como já existente:

| Recurso | Para quê |
| --- | --- |
| Conta Vercel com permissão de criar projeto e ligar o repositório GitHub | runtime de homologação |
| PostgreSQL **17** gerenciado (sugestão: [Neon](https://neon.tech/), [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) ou equivalente) | dados de homologação, **separado** do Compose local e da produção |
| Aplicação Logto **Traditional web** `Arquitetura Kanban — Homologação` | SSO; client id/secret **diferentes** dos de local — [oidc.md §3](oidc.md#3-logto--testes--homologação-vercel) |
| Permissão para proteger `main` no GitHub (status checks) | falha de CI bloqueia merge |

Ainda **não** é necessário: cluster Kubernetes, CyberArk, DNS de produção.

---

## 2. Projeto Vercel

Não há project ID neste repositório. Use o nome que o console mostrar.

1. No [dashboard Vercel](https://vercel.com/dashboard), **Add New… → Project**.
2. Importe o repositório GitHub `<org>/<repo>` (este checkout).
3. Nome sugerido do projeto: `arquitetura-kanban` (vira `https://<projeto-vercel>.vercel.app`). Anote o host **estável** — esse é o `APP_URL` de homologação.
4. Framework preset: **Next.js**. Node.js: **24.x** (mínimo 22 LTS; alinhar ao CI).
5. **Root Directory:** `.` (raiz).
6. **Build Command** (override, obrigatório):

   ```bash
   npm run vercel-build
   ```

   Isso corre `prisma migrate deploy && prisma db seed && next build`. Não use o `npm run build` puro neste projeto: o build da Vercel é o momento em que homologação aplica schema ([§7](#7-estratégia-de-migration)).
7. **Install Command:** deixar o padrão (`npm ci` / `npm install` com lockfile). **Não** ligue instalação só de `dependencies` (`NPM_CONFIG_PRODUCTION=true`): o CLI Prisma está em `devDependencies` e precisa existir no build.
8. **Output:** Next.js (App Router). Não definir output estático. `next.config.ts` desliga `output: "standalone"` quando `process.env.VERCEL` está presente — esse modo é só para o Dockerfile/Kubernetes (T29) e o servidor de E2E; deixado ligado na Vercel, o build quebra com `ENOENT .next/next-server.js.nft.json` porque o builder da própria Vercel já empacota a função serverless.
9. Branch de Production da Vercel: **`main`**.
10. Fluid Compute: deixar o **padrão** dos projetos novos (T04). Não desligar por causa do SSE: o teto de Function continua existindo ([§9](#9-sse-em-homologação-degradado)).
11. **Preview Deployments:** não são homologação e **não** recebem SSO. Opções aceitáveis:
    - desligar previews automáticos neste projeto; ou
    - não preencher `OIDC_*` / `DATABASE_URL` no ambiente Preview (o build de preview falha na validação de env — esperado).

Não invente IDs de projeto, org ou deployment neste guia. Copie os valores do console para um cofre interno.

`vercel.json` **não** entra no repositório. A rota SSE declara `export const maxDuration = 300` em `src/app/api/realtime/sse/route.ts` (teto Hobby/Fluid; o cliente reconecta e faz replay).

---

## 3. PostgreSQL de homologação

Crie **um** banco só para homologação. Credenciais **separadas** do `POSTGRES_*` local e de qualquer produção.

Sugestão (escolha uma; o responsável confirma o fornecedor):

| Opção | Nota |
| --- | --- |
| Neon | PostgreSQL 17; URL **pooled** (Prisma) e **unpooled / direct** (LISTEN em T21) |
| Vercel Postgres | costuma expor host pooled vs direto; mesma distinção |
| Outro Postgres 17 gerenciado | desde que `LISTEN`/`NOTIFY` existam e haja URL de sessão direta |

Passos típicos:

1. Criar o projeto/banco na região **mais próxima** das Functions Vercel (reduz latência e surpresa de conexão).
2. Copiar a connection string **pooled** → `DATABASE_URL` (Prisma, queries).
3. Copiar a connection string **unpooled / direct** → `DATABASE_URL_LISTEN` (hub SSE em T21; [realtime.md](../realtime.md) §4 e [realtime-validation.md](realtime-validation.md) §4).
4. Se o fornecedor só entregar URL pooled, peça a URL direta. Sem ela, `LISTEN` em homologação falha por configuração, não por defeito da app.
5. **Não** aponte a Vercel para o Postgres do Docker Compose. Não reutilize o banco de produção.

A aplicação lê `DATABASE_URL_LISTEN` no `envSchema` (T21). Configure-a **já** no painel: URL **unpooled** / sessão direta. Se estiver vazia, o hub cai em `DATABASE_URL` (inadequado atrás de pooler transacional).

Backup pontual do fornecedor (PITR / snapshot) é desejável para o [rollback de migration](#11-recuperação-de-deploy). Sem isso, uma migration destrutiva em homologação não tem restore fácil — por isso o MVP só aplica `migrate deploy` para frente, nunca `db push` / `migrate reset`.

---

## 4. Variáveis por ambiente

Lista normativa da Tech Spec, mais banco. Valores **só** no painel Vercel → **Settings → Environment Variables**, ambiente **Production** (que neste projeto = homologação). Encrypted / Sensitive para secrets.

| Variável | Obrigatória agora | Onde obter |
| --- | --- | --- |
| `APP_URL` | sim | `https://<projeto-vercel>.vercel.app` **sem** barra final. Se houver domínio customizado de homologação, use esse. |
| `APP_TIME_ZONE` | sim | `America/Sao_Paulo` |
| `DATABASE_URL` | sim | URL pooled do Postgres de homologação (`postgresql://…`) |
| `DATABASE_URL_LISTEN` | sim para SSE | URL **unpooled** / sessão direta. No `envSchema`; se omitida, o hub usa `DATABASE_URL`. |
| `OIDC_ISSUER` | sim | `issuer` do well-known Logto — [oidc.md §3.2](oidc.md#32-issuer-e-discovery) |
| `OIDC_CLIENT_ID` | sim | App ID da app **Homologação** (não a Local) |
| `OIDC_CLIENT_SECRET` | sim | App secret da app Homologação |
| `OIDC_SCOPES` | sim | `openid profile email` |
| `OIDC_AUTHORIZATION_ENDPOINT` | só se discovery falhar | well-known |
| `OIDC_TOKEN_ENDPOINT` | só se discovery falhar | well-known |
| `OIDC_USERINFO_ENDPOINT` | não | opcional |
| `OIDC_LOGOUT_ENDPOINT` | não | opcional; T07 prefere discovery |
| `AUTH_SECRET` | sim | gerar **novo**: `openssl rand -base64 32` (mín. 32 caracteres). ≠ local ≠ produção |

Não criar `AUTH_LOGTO_*`, `NEXTAUTH_URL` nem `AUTH_REDIRECT_PROXY_URL`. Decisão T10: SSO **somente** na URL estável de homologação; previews `*-<hash>.vercel.app` **não** entram na allowlist OIDC (Logto não deve receber curingas).

`AUTH_URL` não é variável normativa; a app espelha `APP_URL` internamente.

Redeploy depois de alterar env (Vercel não aplica secret nova em deployment antigo).

### 4.1 O que **não** fazer

- Copiar `.env` local para a Vercel.
- Reutilizar `AUTH_SECRET` ou `OIDC_CLIENT_SECRET` de outro ambiente.
- Colocar `DATABASE_URL` no GitHub Actions (o CI usa dummy + Postgres de serviço; o banco de homologação **não** entra no workflow).
- `echo`, `printenv` ou logs de debug que imprimam env.

---

## 5. GitHub Actions

Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

| Gatilho | Efeito |
| --- | --- |
| `pull_request` | job `verify` (lint, typecheck, test) e, se passou, `build` |
| `push` em `main` | o mesmo |
| `workflow_dispatch` | o mesmo, manual |

`verify` sobe **PostgreSQL 17** como *service container*, aplica `prisma migrate deploy` nesse banco **efêmero**, e corre as verificações. `build` declara `needs: [verify]`: falha (ou skip) de `verify` **bloqueia** o build. Passos dentro de cada job são sequenciais: a primeira falha encerra o job.

Env OIDC/`AUTH_SECRET` no CI são **dummy** (não secrets do GitHub, não valores de Logto/Vercel). `DATABASE_URL` do CI aponta só para o serviço Postgres do runner.

Testes de invariante **pulam** no laptop se o Postgres local estiver fora. No CI, `CI=true` **falha** se o banco não responder — não mascarar invariantes.

### 5.1 Proteção de `main` (o responsável configura)

No GitHub: **Settings → Branches → Branch protection** em `main`:

- exigir PR;
- exigir os status checks **`verify`** e **`build`** (nomes dos jobs do workflow `CI`);
- sem push direto.

Enquanto a proteção não existir, o workflow ainda falha em vermelho, mas alguém pode mergear na mão. Isso é pendência de permissão no repositório, não de código.

O deploy Vercel **não** espera o Actions por padrão. O bloqueio de entrega é: **só mergear `main` com CI verde** → a Vercel Production (homolog) só recebe `main`.

---

## 6. Fluxo de deploy

```text
feature/*  →  PR  →  GitHub Actions (verify → build)
                         │
                         ▼  CI verde
                   squash merge em main
                         │
                         ▼
              Vercel Production (homologação)
              Build Command = npm run vercel-build
                1. prisma migrate deploy   (banco de homolog)
                2. prisma db seed          (seis domínios, idempotente)
                3. next build
                         │
                         ▼
              https://<projeto-vercel>.vercel.app
```

Esta task **não** usa deploy a partir do GitHub Actions (não há token Vercel nem project id). A integração Git da Vercel publica `main`.

Primeiro deploy útil:

1. Projeto Vercel + banco + env Production preenchidos.
2. `APP_URL` já igual ao host estável.
3. Callbacks Logto já cadastrados ([§8](#8-callbacks-logto)) **ou** um segundo deploy logo após o host aparecer no console.
4. Merge em `main` (ou o primeiro import do repo, se `main` já existir).
5. Conferir logs de **build** na Vercel: migrate + seed + Next, **sem** dump de env.

---

## 7. Estratégia de migration

**Escolha:** homologação aplica `prisma migrate deploy` **no build da Vercel** (`npm run vercel-build`). O CI **não** migra o banco de homologação: só prova as migrations contra o Postgres de serviço. Nunca `prisma db push`. Nunca `prisma migrate dev` na Vercel. Nunca `prisma migrate reset` em homologação.

**Por que no build, e não num job separado:** um único comando amarra schema e código no mesmo deployment de homologação, sem duplicar `DATABASE_URL` no GitHub nem exigir token Vercel (esta task não tem acesso à conta). O risco conhecido é a **dessincronia se o migrate passar e o `next build` falhar**: o banco já avançou, o deployment anterior continua no ar com código velho. Mitigação neste MVP: migrations só para frente e aditivas; se o build quebrar depois do migrate, corrigir o build e redespleiar (o próximo `migrate deploy` é no-op). Se uma migration **destrutiva** já tiver sido aplicada e o código antigo for incompatível, o Instant Rollback da Vercel **não** desfaz o SQL — aí resta restore do fornecedor ou uma migration compensatória. Job de migrate isolado (GHA com secret do banco + deploy hook) daria um ponto de rollback mais nítido e será o modelo a considerar em produção (T29); em homologação o acoplamento build+migrate é aceitável porque os dados não são os de produção e o pipeline permanece simples.

CI: `npx prisma migrate deploy` no job `verify` (banco descartável). Comentário no workflow: o migrate de homologação é o `vercel-build`, não o Actions.

Seed no build: só os seis domínios do PRD, idempotente, **não** altera `isActive` nem inventa usuários. Seeds futuros precisam permanecer idempotentes.

---

## 8. Callbacks Logto

App **Homologação**, não a Local. Paths canônicos: [oidc.md §1](oidc.md#1-paths-canônicos-authjs-v5).

| Campo no Logto | Valor |
| --- | --- |
| Redirect URIs | `https://<projeto-vercel>.vercel.app/api/auth/callback/corporate` |
| Post sign-out redirect URIs | `https://<projeto-vercel>.vercel.app/` |
| CORS allowed origins | `https://<projeto-vercel>.vercel.app` |

HTTPS. Match **exato**. Sem `localhost` nesta app. Sem `…/callback/logto`. Sem curinga de preview.

Rules (allowlist) desta aplicação, de novo: a allowlist Local **não** vale automaticamente. Cadastro público do tenant já desligado se [oidc.md §2.5](oidc.md#25-restringir-quem-entra-obrigatório) foi feito.

Depois de gravar `APP_URL` e os callbacks, **redeploy**.

---

## 9. SSE em homologação (degradado)

Homologação **não** oferece SSE de jornada de trabalho contínua. O protocolo continua SSE (`GET /api/realtime/sse`); o runtime Vercel **corta** a Function em `maxDuration = 300` (Hobby: 300 s; Pro/Enterprise: até 800 s GA / 1800 s beta). O cliente reconecta; replay por `Last-Event-ID` cobre o buraco. Frames duplicados (mesmo `id`) são tolerados. Fontes e tetos: [realtime.md](../realtime.md) §11.1.

Não vender esta URL como “SSE o dia inteiro”. Não tratar preview Vercel como aceite de realtime de produção. Prova longa e réplicas: Kubernetes (T29). Prova HTTP autenticada na Vercel: **pendente de acesso**.

A rota declara:

```ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300
```

`DATABASE_URL_LISTEN` unpooled é obrigatória para o `LISTEN` não morrer no pooler transacional.

**Cleanup de `RealtimeEvent` (7 dias):** em homologação **não** há Cron Vercel nesta task (não existe ainda a rota/job de limpeza). Aceita-se crescimento da tabela até T21/T29; com cinco usuários o volume é irrelevante. Produção: CronJob no cluster (T29), **nunca** apagar `AuditEvent`.

Se a prova futura mostrar que `LISTEN` é bloqueado no banco de homologação mesmo unpooled, isso é **bloqueio de infra** a registrar; opção operacional: homologar realtime no Compose ou no cluster, **sem** abandonar SSE.

---

## 10. Roteiro de validação

**Nenhum item abaixo está concluído neste repositório.** Marque na issue só depois de executar de verdade.

### 10.1 Sem a app no ar (contas)

1. Projeto Vercel existe; host estável anotado.
2. Postgres de homologação alcançável a partir de uma máquina confiável (`psql` ou SQL editor do fornecedor) — **não** colar a URL na issue.
3. Well-known Logto da app Homologação abre; `OIDC_ISSUER` bate com `"issuer"`.
4. Redirect URI cadastrada = `{APP_URL}/api/auth/callback/corporate`.

### 10.2 Depois do primeiro deploy (responsável + implementador)

5. Build Vercel verde: migrate deploy + seed + Next. Logs **sem** secrets.
6. Usuário **na** allowlist da app Homologação completa SSO e vê o shell autenticado.
7. Usuário **fora** da allowlist não entra.
8. Conferir no banco de homologação: linha em `User` após o primeiro login (issuer Logto + `sub`); seis linhas de domínio após o seed.
9. Logout volta a `{APP_URL}/`.

Evidência: data, URL de homologação, “passou/falhou”. **Não** cole tokens, cookies nem connection strings.

### 10.3 Diagnóstico (sem secrets)

| Sintoma | Verificação |
| --- | --- |
| `Invalid environment variables` | env Production incompleta; `APP_URL` com barra final; `AUTH_SECRET` &lt; 32 |
| `Can't reach database server` no build | `DATABASE_URL` pooled errada; firewall / allowlist do Neon sem IPs da Vercel (muitos planos Neon aceitam `0.0.0.0/0` só para serverless — confirmar no fornecedor) |
| `P1005` / migration falhou | SQL da pasta `prisma/migrations`; **não** compensar com `db push` |
| `redirect_uri mismatch` | URI Logto ≠ `{APP_URL}/api/auth/callback/corporate`; `APP_URL` ≠ host real |
| Login ok no IdP, 403 na app | `User.isActive`? app Logto errada (Local vs Homologação)? |
| SSE “cai” aos ~5 min | teto `maxDuration` — **comportamento esperado** em homologação, não bug de produto |

Não ligue debug que imprima ID Token, `AUTH_SECRET` ou `DATABASE_URL`.

---

## 11. Recuperação de deploy

### 11.1 Código / runtime (Vercel)

1. No dashboard, abra o projeto → **Deployments**.
2. **Instant Rollback** (ou Promote) do deployment **anterior saudável**.
3. Isso restaura o **código** e as Functions. **Não** desfaz `prisma migrate deploy` já aplicado.

### 11.2 Migration falhou no build

O deployment novo **não** entra no ar (o anterior permanece). Corrija a migration no repositório (migration nova; não reescreva a que já foi aplicada noutro ambiente), CI verde, merge. Não use `db push`.

### 11.3 Migration passou e o build Next falhou

Schema de homologação pode estar **à frente** do código ainda publicado. Não rode `migrate reset`. Faça o `next build` passar e redespleie; `migrate deploy` seguinte é no-op. Se o código antigo em produção Vercel for incompatível com o schema novo, o Instant Rollback **piora** a situação — priorize um hotfix de código, não o rollback, até o schema e o bundle baterem.

### 11.4 Dados corrompidos / migration destrutiva

Restore do snapshot/PITR do fornecedor (Neon/Vercel Postgres), se existir. Sem backup, homologação pode ser **recriada** (banco novo + `migrate deploy` + seed + recadastrar allowlist via logins). Produção terá runbook próprio (T29).

### 11.5 Segredo vazou

Rotacionar no Logto / Postgres / `AUTH_SECRET` no painel; **não** commitar o valor; redespleiar. Invalidar sessões: trocar `AUTH_SECRET` derruba cookies Auth.js.

---

## 12. Relação com outras tasks

| Task | Uso deste guia |
| --- | --- |
| T07 | login Auth.js já existe; validar SSO **nesta** URL quando as contas existirem |
| T09 | cadastros contra o banco de homologação (não o local) |
| T21 | `maxDuration`, `DATABASE_URL_LISTEN`, reconexão; não fechar aceite de SSE longo aqui |
| T28 | E2E na URL de homologação |
| T29 | produção é Kubernetes + CyberArk; Job de migrate **antes** do rollout, não `vercel-build`. Guias: [production.md](production.md), [backup-restore.md](backup-restore.md). **Não** promover este projeto Vercel a produção |

---

## 13. Status nesta task (T10)

| Item | Estado |
| --- | --- |
| Workflow GitHub Actions no repositório | escrito (`.github/workflows/ci.yml`) |
| CI verde no GitHub remoto | **pendente** de Actions no repo / proteção de `main` |
| Projeto Vercel + Postgres + env reais | **pendente** de contas |
| Callbacks Logto na URL Vercel | **pendente** do host estável |
| Login Logto em homologação | **não validado** |
| Acesso ao banco de homologação pela app | **pendente** |
| SSE ilimitado em homologação | **fora de escopo** (modo degradado documentado) |

Credenciais ausentes = dependência. Não tratar este documento como aceite de homologação no ar.
