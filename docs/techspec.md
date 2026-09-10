# Tech Spec — Gestão de Atividades de Arquitetura

**Versão:** 1.0
**Status:** Fechado para Desenvolvimento
**Tipo:** MVP
**Documento relacionado:** PRD — Gestão de Atividades de Arquitetura v1.0

## Decisão de autenticação atualizada

A aplicação utilizará **OpenID Connect (OIDC)** como protocolo de autenticação e permanecerá **agnóstica ao Identity Provider**.

Os provedores inicialmente utilizados serão:

```text
Desenvolvimento / Testes
        │
        ▼
   Logto Cloud
        │
       OIDC
        │
        ▼
   Aplicação

Produção
        │
        ▼
     CyberArk
        │
       OIDC
        │
        ▼
   Aplicação
```

O domínio da aplicação não deverá possuir dependência direta de:

* Logto;
* CyberArk;
* APIs proprietárias do Identity Provider;
* SDKs específicos do provedor, salvo quando estritamente necessário na camada de infraestrutura.

A integração deverá depender exclusivamente do contrato OIDC.

## Configuração OIDC

A camada de autenticação receberá sua configuração através do ambiente:

```text
OIDC_ISSUER
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
OIDC_SCOPES
OIDC_AUTHORIZATION_ENDPOINT    # somente se discovery não estiver disponível
OIDC_TOKEN_ENDPOINT            # somente se discovery não estiver disponível
OIDC_USERINFO_ENDPOINT         # opcional
OIDC_LOGOUT_ENDPOINT           # opcional

AUTH_SECRET
APP_URL
```

Sempre que possível deverá ser utilizado:

```text
{issuer}/.well-known/openid-configuration
```

para descoberta automática dos endpoints do provedor.

## Adapter de autenticação

A arquitetura conceitual será:

```text
┌───────────────────────────────────────────┐
│                Application                │
│                                           │
│            Auth / Session Layer           │
│                    │                      │
│                    ▼                      │
│          OIDC Authentication Adapter      │
│                    │                      │
│        ┌───────────┴───────────┐          │
│        │                       │          │
│   OIDC Configuration      Claim Mapping   │
└────────┼───────────────────────┼──────────┘
         │                       │
         ▼                       ▼
   OpenID Connect          Normalized User
         │
    ┌────┴─────┐
    ▼          ▼
 Logto       CyberArk
Cloud         PROD
```

O restante da aplicação conhecerá apenas uma identidade normalizada.

Exemplo conceitual:

```typescript
type AuthenticatedIdentity = {
  subject: string
  issuer: string
  email?: string
  displayName?: string
  groups?: string[]
}
```

Nenhuma regra de negócio deverá acessar claims brutos diretamente.

## Identificação persistente do usuário

O identificador externo do usuário será composto por:

```text
issuer + subject
```

e não somente por e-mail.

Modelo:

```text
User
----
id                  UUID
oidcIssuer          VARCHAR
oidcSubject         VARCHAR

email               VARCHAR
displayName         VARCHAR

isActive            BOOLEAN

createdAt           TIMESTAMPTZ
updatedAt           TIMESTAMPTZ
lastLoginAt         TIMESTAMPTZ
```

Constraint:

```text
UNIQUE(oidcIssuer, oidcSubject)
```

Isso permite que:

```text
Logto
CyberArk
outro IdP futuro
```

sejam utilizados sem alterar o modelo de autenticação da aplicação.

## Claim Mapping

Como diferentes provedores podem fornecer claims diferentes, deverá existir uma camada explícita de normalização.

Exemplo:

```text
OIDC Token
    │
    ▼
Claim Mapper
    │
    ├── sub        → subject
    ├── iss        → issuer
    ├── email      → email
    ├── name       → displayName
    └── groups     → groups
          │
          ▼
AuthenticatedIdentity
```

Claims opcionais não poderão impedir autenticação caso não sejam necessários para autorização.

`sub` e `iss` serão considerados a identidade primária.

## Logto

O **Logto Cloud** será utilizado como Identity Provider nos ambientes não produtivos.

Uso esperado:

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

Com isso, o Docker Compose local não precisará executar um Identity Provider.

O ambiente de desenvolvimento poderá ser iniciado aproximadamente como:

```text
docker compose up
```

contendo apenas os componentes necessários à aplicação, como:

```text
Next.js
PostgreSQL
```

A autenticação continuará utilizando o serviço Logto externo.

Isso reduz:

* memória local;
* tempo de inicialização;
* configuração do Compose;
* manutenção de infraestrutura de identidade apenas para desenvolvimento.

Credenciais de desenvolvimento deverão utilizar uma aplicação OIDC própria no Logto e nunca compartilhar as credenciais utilizadas em outros ambientes.

## CyberArk

Produção utilizará **CyberArk via OIDC**.

A troca de Logto para CyberArk deverá ocorrer majoritariamente através de configuração:

```text
OIDC_ISSUER
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
OIDC_SCOPES
```

e, quando necessário, configuração do mapper de claims.

Não deverão existir condicionais espalhadas pelo código como:

```typescript
if (provider === "cyberark") {
   ...
}

if (provider === "logto") {
   ...
}
```

Caso alguma incompatibilidade do provedor precise ser tratada, ela deverá ficar encapsulada na camada de autenticação.

## Ambientes

A matriz final fica:

| Ambiente           | Runtime        | PostgreSQL             | Identity Provider |
| ------------------ | -------------- | ---------------------- | ----------------- |
| Local              | Docker Compose | PostgreSQL no Compose  | Logto Cloud       |
| Testes/Homologação | Vercel         | PostgreSQL do ambiente | Logto Cloud       |
| Produção           | Kubernetes     | PostgreSQL gerenciado  | CyberArk          |

A aplicação utilizará a mesma implementação OIDC nos três ambientes.

Somente configuração e credenciais serão diferentes.

## Docker Compose

O ambiente local deverá conter, inicialmente:

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

## Estratégia de sessão

Após autenticação OIDC:

```text
Browser
   │
   ▼
Identity Provider
   │
   ▼
Authorization Code
   │
   ▼
Next.js
   │
   ▼
OIDC Token Validation
   │
   ▼
Normalized Identity
   │
   ▼
Local User
   │
   ▼
Session
```

A aplicação não armazenará:

* senha;
* hash de senha;
* MFA;
* credenciais do usuário;
* tokens corporativos desnecessariamente.

## Autorização

No MVP, o modelo continua simples.

Usuários autorizados poderão acessar os recursos operacionais da aplicação.

A decisão sobre quem pode autenticar deverá preferencialmente permanecer no Identity Provider.

A aplicação continuará validando autorização no servidor para todas as operações.

Ocultar elementos na UI não será mecanismo de segurança.

---

# Arquitetura Consolidada do MVP

```text
                              OIDC
                     ┌─────────┴──────────┐
                     │                    │
                Logto Cloud           CyberArk
                DEV / TEST              PROD
                     │                    │
                     └─────────┬──────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────┐
│                    Next.js                       │
│                                                  │
│               OIDC Auth Adapter                  │
│                       │                          │
│                       ▼                          │
│             Application Services                 │
│                       │                          │
│       ┌───────────────┼────────────────┐         │
│       │               │                │         │
│   Activities       Projects        Reports       │
│       │               │                │         │
│       └───────────────┼────────────────┘         │
│                       │                          │
│             Audit + Realtime                     │
│                       │                          │
│              SSE Realtime Hub                    │
└───────────────────────┼──────────────────────────┘
                        │
                        ▼
                   PostgreSQL
                ├── Domain Data
                ├── AuditEvent
                ├── RealtimeEvent
                └── LISTEN / NOTIFY
```

# Ambientes Consolidados

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


PRODUÇÃO
Kubernetes
├── Next.js replicas
├── Realtime / SSE
├── CronJob realtime cleanup
└───────────────► PostgreSQL gerenciado
        │
        └──── OIDC ──────────────► CyberArk
```

# ADR-012 — Identity Provider agnóstico via OIDC

**Decisão:** a aplicação utilizará exclusivamente um contrato OIDC normalizado para autenticação.

**Provedores iniciais:**

```text
Logto Cloud → desenvolvimento e testes
CyberArk    → produção
```

**Motivação:**

* evitar acoplamento com CyberArk;
* utilizar um serviço gerenciado nos ambientes não produtivos;
* evitar executar infraestrutura de identidade desnecessária no Docker Compose;
* facilitar desenvolvimento;
* permitir substituição futura do provedor;
* manter comportamento de autenticação semelhante entre ambientes.

**Consequência:** diferenças de claims entre os provedores deverão ser resolvidas pela camada `OIDC Authentication Adapter`.

---

# ADR-013 — Logto Cloud nos ambientes não produtivos

**Decisão:** Logto Cloud substitui o Keycloak anteriormente considerado para desenvolvimento.

O Logto não fará parte do Docker Compose padrão.

**Motivação:** utilizar Identity Provider gerenciado, reduzindo infraestrutura local e aproximando o desenvolvimento de um fluxo OIDC real externo.

---

# Status das decisões

Com esta alteração:

```text
Identity Provider DEV/TEST
Logto Cloud                         ✅

Identity Provider PROD
CyberArk / OIDC                     ✅

Aplicação agnóstica ao IdP          ✅

Desenvolvimento
Docker Compose                      ✅

Testes/Homologação
Vercel                              ✅

Produção
Kubernetes                          ✅

Realtime
SSE + LISTEN/NOTIFY                 ✅

Replay
RealtimeEvent + Last-Event-ID       ✅

Retenção realtime
7 dias                              ✅

Cleanup
Kubernetes CronJob                  ✅

Concorrência
Optimistic Locking                  ✅

Banco
PostgreSQL                          ✅

Backup
Responsabilidade da infraestrutura ✅

Exportação MVP
CSV UTF-8 BOM                       ✅
```

**Tech Spec v1.0 — Fechado para Desenvolvimento.**
