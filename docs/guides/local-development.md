# Desenvolvimento local

**Task:** T05  
**Versão:** 1.0  
**Status:** Procedimento para o responsável e o time. **Login SSO não faz parte desta task (T07).**  
**OIDC externo:** [oidc.md](oidc.md) (Logto Cloud; Compose **sem** IdP)  
**Arquitetura:** [architecture.md](../architecture.md)

Este guia descreve como um checkout novo sobe a aplicação e o PostgreSQL. Não contém credenciais. Use `CHANGEME` e `<…>` até colar valores no `.env` **não versionado**.

---

## 1. Pré-requisitos

| Recurso | Versão / nota |
| --- | --- |
| Node.js | **22+**; recomendado **24 LTS** (imagem Docker da app: Node 24) |
| npm | o que vier com o Node (lockfile `package-lock.json`; não use pnpm) |
| Docker + Docker Compose | para `app` + `postgres` |
| Conta Logto Cloud | tenant do time; criar a app **Traditional web** *Local* conforme [oidc.md §2](oidc.md#2-logto--ambiente-local) |
| Porta **3000** | livre no host (UI) |
| Porta **5432** | livre no host se for expor o Postgres (Prisma no host) |

Não é necessário (e **não** deve) subir Logto, Keycloak ou outro IdP no Compose.

---

## 2. Variáveis de ambiente

1. Copie o exemplo:

```bash
cp .env.example .env
```

2. Preencha **no `.env`**, nunca no git, issues ou neste guia.

| Variável | Obrigatória | Onde obter / valor local |
| --- | --- | --- |
| `APP_URL` | sim | `http://localhost:3000` (sem barra final) |
| `APP_TIME_ZONE` | sim | `America/Sao_Paulo` |
| `POSTGRES_USER` | Compose | `arquitetura` (exemplo) |
| `POSTGRES_PASSWORD` | Compose | senha **não-root**; placeholder `CHANGEME` até gerar a sua |
| `POSTGRES_DB` | Compose | `arquitetura` |
| `POSTGRES_PORT` | Compose | `5432` no host |
| `DATABASE_URL` | sim | no host: `postgresql://<user>:<senha>@localhost:5432/<db>`. O serviço `app` do Compose **substitui o host por `postgres`**. |
| `DATABASE_URL_LISTEN` | não (cai em `DATABASE_URL`) | sessão `LISTEN` do hub SSE. Localmente pode repetir `DATABASE_URL`. Homologação Vercel: URL **unpooled**. |
| `OIDC_ISSUER` | sim | campo `issuer` do well-known Logto — [oidc.md §2.2](oidc.md#22-copiar-identificadores-sem-colar-no-git) |
| `OIDC_CLIENT_ID` | sim | App ID Logto (app Local) |
| `OIDC_CLIENT_SECRET` | sim | App secret Logto |
| `OIDC_SCOPES` | sim | `openid profile email` |
| `OIDC_AUTHORIZATION_ENDPOINT` | só se discovery falhar | copiar do JSON well-known |
| `OIDC_TOKEN_ENDPOINT` | só se discovery falhar | copiar do JSON well-known |
| `OIDC_USERINFO_ENDPOINT` | não | opcional |
| `OIDC_LOGOUT_ENDPOINT` | não | opcional; T07 prefere o discovery |
| `AUTH_SECRET` | sim | gerar na máquina: `openssl rand -base64 32` (mín. 32 caracteres). Não reutilizar homolog/prod. |

A validação na subida da app está em `src/config/env.ts` (Zod). Segredos **não** entram no repositório (`.gitignore` cobre `.env`).

`next-auth` já está nas dependências; o fluxo de login **não** está implementado (T07). Callbacks a registrar no Logto (quando T07 existir): `{APP_URL}/api/auth/callback/corporate` — detalhe em [oidc.md §1](oidc.md#1-paths-canônicos-authjs-v5).

---

## 3. Docker Compose (`app` + `postgres`)

Serviços: **somente** `app` e `postgres`. Rede interna `internal`. Volume `postgres_data` persiste o banco entre `docker compose down` / `up` (apagar o volume destrói os dados).

O Compose constrói o `Dockerfile` no target **`development`** (entrypoint com `prisma migrate deploy` + `npm run dev`). A imagem de produção (`docker build --target production`, usuário non-root, `node server.js`) é para Kubernetes — [production.md](production.md).

A app escuta em **http://localhost:3000**. O container alcança o Logto Cloud na internet; o Compose não publica o IdP.

```bash
docker compose up --build
```

Na primeira subida o entrypoint gera o client Prisma, aplica migrations (`prisma migrate deploy`) e o seed idempotente dos seis domínios do PRD. Pare com `Ctrl+C` ou `docker compose down`. **Não** use `-v` se quiser manter o banco.

Se as dependências npm mudarem, reconstrua a imagem:

```bash
docker compose build --no-cache app
docker compose up
```

---

## 4. Migrations e seeds

O schema em `prisma/schema.prisma` é o modelo relacional do MVP (T06). A migration `20260910200000_t05_schema_health` criou o placeholder `SchemaHealth`; `20260910223000_t06_relational_model` **remove** essa tabela e cria o modelo completo. Não reescreva a T05. Diagrama e restrições: [data-model.md](../data-model.md).

| Script | Uso |
| --- | --- |
| `npm run db:generate` | `prisma generate` (também no `postinstall`; client em `src/generated/prisma`) |
| `npm run db:migrate` | `prisma migrate deploy` (CI / Compose / homolog / volume local já existente) |
| `npm run db:migrate:dev` | `prisma migrate dev` (criar **nova** migration no local; T06 já está versionada) |
| `npm run db:seed` | upsert idempotente dos seis domínios do PRD; não inventa áreas/projetos/usuários |

Com o Postgres do Compose no ar e `DATABASE_URL` apontando para `localhost`:

```bash
npm run db:migrate
npm run db:seed
```

Checkout que já aplicou só a T05: `db:migrate` aplica apenas a T06. UNIQUE parciais e CHECKs vivem no SQL da T06; se `migrate diff` sugerir dropá-los, **não** aceite.

Não use `prisma db push` como fluxo padrão. Ignore o aviso da CLI para `prisma@latest` (8 RC); o MVP permanece em **7.10.x**.

---

## 5. Inicialização (dois caminhos)

### 5.1 Tudo no Compose (recomendado para reproduzir o checkout)

```bash
cp .env.example .env
# preencha OIDC_*, AUTH_SECRET e a senha do Postgres
docker compose up --build
```

Abra `http://localhost:3000`. A home confirma que a app subiu; **não** há Kanban nem botão de SSO nesta task.

### 5.2 App no host, só o Postgres no Compose

Útil para o Next.js no Node local:

```bash
docker compose up postgres
cp .env.example .env
# DATABASE_URL com host localhost
npm install
npm run db:migrate
npm run dev
```

`npm run dev` publica em `0.0.0.0:3000` (também acessível em `http://localhost:3000`). Depois de `db:migrate`, rode `npm run db:seed` se ainda não tiver os seis domínios.

Verificações da ferramenta (sem Docker):

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

---

## 6. Diagnóstico

| Sintoma | Verificação |
| --- | --- |
| `EADDRINUSE` / porta 3000 | `ss -ltnp \| grep 3000` (ou equivalente). Liberar a porta ou alterar só se o time inteiro mudar o `APP_URL` e o callback Logto. |
| App no Compose não conecta no banco | `DATABASE_URL` do serviço `app` deve usar host **`postgres`**, não `localhost`. Conferir `docker compose logs postgres` e o healthcheck (`pg_isready`). |
| `password authentication failed` | `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` iguais aos da URL. Volume antigo criado com outra senha: `docker compose down` **não** apaga dados; só um `docker volume rm` do volume `postgres_data` (destrutivo) recria com o `.env` atual. |
| Prisma: `Can't reach database server` | Postgres saudável? Porta 5432 no host ocupada por outro Postgres? Conferir `POSTGRES_PORT`. |
| `Invalid environment variables` | `.env` incompleto; `APP_URL` sem barra final; `AUTH_SECRET` com menos de 32 caracteres. A mensagem lista o campo; **não** ligue log que imprima secrets. |
| Discovery OIDC falhou (relevante a partir de T07) | Abrir `{OIDC_ISSUER}/.well-known/openid-configuration` no browser. JSON deve ter `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`. O container da app precisa alcançar esse HTTPS (proxy corporativo?). Overrides `OIDC_*_ENDPOINT` só se o well-known for inacessível. Passos e allowlist: [oidc.md §7](oidc.md#7-roteiro-de-validação). |
| Login ainda não existe | Esperado na T05. Não configure SDK Logto. |
| Prisma CLI sugere `npm i prisma@latest` (8 RC) | Ignore. O MVP está em **7.10.x** ([ADR-014](../adr/ADR-014-orm-prisma.md)). |

Banco persistente: após `docker compose down` e `docker compose up`, os dados em `postgres_data` permanecem. Confira com `docker volume ls` (`arquitetura-kanban_postgres_data` ou nome semelhante).

---

## 7. Relação com outras tasks

| Task | Uso deste guia |
| --- | --- |
| T06 | [data-model.md](../data-model.md) — schema, migration, seeds dos seis domínios |
| T07 | login Auth.js; validar callbacks com [oidc.md](oidc.md); provisionar `User` por issuer+subject |
| T10 | [homologation.md](homologation.md) — não copiar o `.env` local para a Vercel |
| T29 | [production.md](production.md) — Compose usa target `development`; produção é `--target production` |

Contrato de identidade: [identity.md](../identity.md).
