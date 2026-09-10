# ADR-014 — ORM Prisma 7 com PostgreSQL

**Status:** Aceito
**Data:** 2026-09-10
**Task:** T01
**Consulta npm:** 2026-09-10

## Contexto

A Tech Spec fechou PostgreSQL e a decisão 1 de 10/09/2026 fechou Prisma. Faltava registrar a linha de versão, o papel do Prisma nas camadas e o fluxo de migrations.

Em 10/09/2026, `prisma@latest` no npm é **8.0.0-rc.13** (release candidate). A linha estável de produção é **Prisma 7.10.0**. Prisma 8 permanece Apache-2.0, mas ainda não é o alvo deste MVP.

Prisma 7 exige driver adapter: para PostgreSQL, `@prisma/adapter-pg` + `pg`. `new PrismaClient()` sem adapter falha.

## Decisão

1. Usar **Prisma ORM 7.10.x** (`prisma`, `@prisma/client`, `@prisma/adapter-pg` na mesma versão).
2. Gerar o client e aplicar schema com **Prisma Migrate** (`migrate dev` local; `migrate deploy` nos demais ambientes).
3. Isolar o Prisma em `src/infrastructure/db`. Serviços de aplicação dependem de portas (interfaces), não de `PrismaClient`.
4. Usar `pg` tanto no adapter quanto, mais tarde, na conexão dedicada de `LISTEN` (T04/T21).

## Consequências

- T05 instancia o client com `PrismaPg` e `DATABASE_URL`.
- T06 versiona `prisma/schema.prisma` e a primeira migration; inclui `version`, `AuditEvent`, `RealtimeEvent` e `UNIQUE(oidcIssuer, oidcSubject)`.
- Homologação/produção não usam `prisma db push` como fluxo padrão.
- Upgrade para Prisma 8 só com ADR novo, depois de GA estável e guia de Migrate para PostgreSQL.

## Alternativas consideradas

| Alternativa | Motivo de recusa |
| --- | --- |
| Prisma 8 RC | RC; `latest` no npm hoje. Risco indevido no MVP. |
| Drizzle | Não aprovado em 10/09; perderia o fechamento Prisma. |
| SQL cru / `pg` só | Perde tipos e Migrate; `pg` fica restrito a adapter + LISTEN. |
| TypeORM / Sequelize | Mais pesados; fora da decisão aprovada. |
