# ADR-013 — Logto Cloud nos ambientes não produtivos

**Status:** Aceito
**Data:** 2026-09-10
**Fonte:** docs/techspec.md v1.0 — Fechado para Desenvolvimento (extração fiel, sem alteração do original)

## Contexto

A autenticação é OIDC agnóstica ao IdP (ADR-012): Logto Cloud em DEV/TEST, CyberArk em PROD. Faltava fechar qual IdP sustenta o desenvolvimento local e os testes sem exigir infraestrutura própria de identidade.

A Tech Spec registra que o **Logto Cloud substitui o Keycloak anteriormente considerado** para desenvolvimento.

Uso esperado fechado:

```text
Local development
        │
        ├── Next.js via Docker Compose
        │
        └── autenticação → Logto Cloud

Ambiente de testes / Vercel
        │
        └── autenticação → Logto Cloud
```

Recorte da matriz de ambientes:

| Ambiente           | Runtime        | PostgreSQL             | Identity Provider |
| ------------------ | -------------- | ---------------------- | ----------------- |
| Local              | Docker Compose | PostgreSQL no Compose  | Logto Cloud       |
| Testes/Homologação | Vercel         | PostgreSQL do ambiente | Logto Cloud       |

## Decisão

1. O **Logto Cloud** será utilizado como Identity Provider nos ambientes não produtivos (Local e Testes/Homologação).
2. O Logto **não fará parte do Docker Compose padrão**.
3. O ambiente local deverá conter, inicialmente:

```text
services:
  app
  postgres
```

Não será necessário executar Logto dentro do Compose.

Conceitualmente:

```text
Developer
    │
    ▼
localhost:3000
    │
    ▼
Next.js Container
    │
    ├──────────────► PostgreSQL Container
    │
    └──────────────► Logto Cloud
```

4. O ambiente de desenvolvimento poderá ser iniciado aproximadamente como:

```text
docker compose up
```

contendo apenas os componentes necessários à aplicação, como:

```text
Next.js
PostgreSQL
```

A autenticação continuará utilizando o serviço Logto externo.

5. Credenciais de desenvolvimento deverão utilizar uma aplicação OIDC própria no Logto e nunca compartilhar as credenciais utilizadas em outros ambientes.

Ambientes consolidados (recorte DEV/TEST):

```text
LOCAL
Docker Compose
├── Next.js
└── PostgreSQL
       │
       └────────── OIDC ─────────► Logto Cloud


TEST / HOMOLOGAÇÃO
Vercel
   │
   ├──────────────► PostgreSQL
   │
   └──── OIDC ───► Logto Cloud
```

## Consequências

- Utilizar Identity Provider gerenciado, reduzindo infraestrutura local e aproximando o desenvolvimento de um fluxo OIDC real externo.
- Com isso, o Docker Compose local não precisará executar um Identity Provider.
- Isso reduz:
  - memória local;
  - tempo de inicialização;
  - configuração do Compose;
  - manutenção de infraestrutura de identidade apenas para desenvolvimento.
- A aplicação utiliza a mesma implementação OIDC nos ambientes DEV/TEST e PROD; somente configuração e credenciais são diferentes (ADR-012).
- Segregação obrigatória de credenciais OIDC por ambiente no Logto.
- Detalha a implementação: ADR-015 (Auth.js v5 com OIDC genérico) e T05 (Compose sem IdP).

## Alternativas consideradas

| Alternativa | Motivo de recusa (conforme Tech Spec) |
| --- | --- |
| Keycloak (considerado anteriormente) | Substituído por Logto Cloud como IdP gerenciado em DEV/TEST |
| Executar IdP dentro do Docker Compose | Infraestrutura, memória, boot e manutenção desnecessários para dev; Compose fica só com `app` + `postgres` |
| Compartilhar a mesma aplicação/credenciais OIDC entre ambientes | Proibido; dev deve usar aplicação OIDC própria no Logto |
| IdP diferente por ambiente com implementações diferentes | Rejeitado; mesma implementação OIDC, só config/credenciais mudam (ADR-012) |
