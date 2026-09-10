# arquitetura-kanban

Aplicação Next.js (App Router) do MVP de Gestão de Atividades de Arquitetura, com PostgreSQL no Docker Compose e autenticação OIDC contra o Logto Cloud — sem Identity Provider no Compose. Para pré-requisitos, variáveis, Compose e diagnóstico, use o [guia de desenvolvimento local](docs/guides/local-development.md). Homologação Vercel: [docs/guides/homologation.md](docs/guides/homologation.md).

## CI

Pull requests, pushes em `main` e disparos manuais correm [`.github/workflows/ci.yml`](.github/workflows/ci.yml) no GitHub Actions:

1. Job **`verify`**: Node 24, `npm ci`, PostgreSQL 17 de serviço, `prisma generate` + `prisma migrate deploy`, depois `npm run lint`, `typecheck` e `test` (passos sequenciais; a primeira falha encerra o job).
2. Job **`build`**: só corre se `verify` passou (`needs`); `npm ci`, `prisma generate` e `npm run build`.

Variáveis `OIDC_*`, `AUTH_SECRET`, `APP_URL` e `DATABASE_URL` no CI são **dummy** — não secrets reais. O Postgres do runner é obrigatório: testes de invariante que pulam no laptop sem banco **falham** no CI se o serviço não responder.

O deploy de homologação **não** é este workflow; a Vercel publica `main` com `npm run vercel-build` (`migrate deploy` + seed + `next build`). Detalhe: [homologation.md](docs/guides/homologation.md).
