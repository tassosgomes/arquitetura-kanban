# ADR-012 — Identity Provider agnóstico via OIDC

**Status:** Aceito
**Data:** 2026-09-10
**Fonte:** docs/techspec.md v1.0 — Fechado para Desenvolvimento (extração fiel, sem alteração do original)
**Documento relacionado:** PRD — Gestão de Atividades de Arquitetura v1.0

## Contexto

A aplicação precisa de autenticação corporativa com comportamento semelhante nos três ambientes (Local, Testes/Homologação, Produção), sem acoplar o domínio a um Identity Provider específico.

Provedores iniciais definidos na Tech Spec:

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

A matriz de ambientes fechada é:

| Ambiente           | Runtime        | PostgreSQL             | Identity Provider |
| ------------------ | -------------- | ---------------------- | ----------------- |
| Local              | Docker Compose | PostgreSQL no Compose  | Logto Cloud       |
| Testes/Homologação | Vercel         | PostgreSQL do ambiente | Logto Cloud       |
| Produção           | Kubernetes     | PostgreSQL gerenciado  | CyberArk          |

A aplicação utilizará a mesma implementação OIDC nos três ambientes. Somente configuração e credenciais serão diferentes.

## Decisão

1. A aplicação utilizará exclusivamente um contrato **OpenID Connect (OIDC)** normalizado para autenticação e permanecerá **agnóstica ao Identity Provider**.
2. O domínio da aplicação não terá dependência direta de:
   - Logto;
   - CyberArk;
   - APIs proprietárias do Identity Provider;
   - SDKs específicos do provedor, salvo quando estritamente necessário na camada de infraestrutura.
3. A integração dependerá exclusivamente do contrato OIDC.

### Configuração OIDC via ambiente

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

### OIDC Authentication Adapter

Arquitetura conceitual fechada:

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

O restante da aplicação conhecerá apenas uma identidade normalizada. Exemplo conceitual da Tech Spec:

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

### Identificação persistente do usuário

O identificador externo do usuário será composto por:

```text
issuer + subject
```

e não somente por e-mail.

Modelo fechado:

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

### Claim Mapping

Como diferentes provedores podem fornecer claims diferentes, deverá existir uma camada explícita de normalização.

Exemplo da Tech Spec:

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

Regras:

- Claims opcionais não poderão impedir autenticação caso não sejam necessários para autorização.
- `sub` e `iss` serão considerados a identidade primária.

### Troca Logto → CyberArk via configuração

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

### Estratégia de sessão

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

- senha;
- hash de senha;
- MFA;
- credenciais do usuário;
- tokens corporativos desnecessariamente.

### Autorização no MVP

No MVP, o modelo continua simples:

- Usuários autorizados poderão acessar os recursos operacionais da aplicação.
- A decisão sobre quem pode autenticar deverá preferencialmente permanecer no Identity Provider.
- A aplicação continuará validando autorização no servidor para todas as operações.
- Ocultar elementos na UI não será mecanismo de segurança.

### Arquitetura consolidada (recorte OIDC)

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

## Consequências

- Evita acoplamento com CyberArk.
- Permite substituição futura do provedor sem alterar o modelo de autenticação.
- Mantém comportamento de autenticação semelhante entre ambientes.
- Diferenças de claims entre os provedores deverão ser resolvidas pela camada `OIDC Authentication Adapter`.
- `UNIQUE(oidcIssuer, oidcSubject)` passa a ser constraint obrigatória do modelo `User`.
- Autorização continua validada no servidor; UI não é barreira de segurança.
- Detalham a implementação: ADR-015 (Auth.js v5 com OIDC genérico), T03 (callbacks/scopes/política) e T07 (implementação).

## Alternativas consideradas

| Alternativa | Motivo de recusa (conforme Tech Spec) |
| --- | --- |
| Acoplamento direto a SDK/API de Logto ou CyberArk | Violaria o agnosticismo ao IdP; troca de provedor exigiria mudança no domínio |
| Identificar usuário só por e-mail | E-mail muda/repete entre IdPs; identidade primária é `iss` + `sub` |
| Acessar claims brutos nas regras de negócio | Espalharia diferenças de provedor pelo código; normalização é obrigatória no adapter |
| Condicionais `if (provider === ...)` espalhadas | Incompatibilidade deve ficar encapsulada na camada de autenticação |
| Persistir senha/hash/MFA/tokens corporativos | Fora do modelo OIDC delegado; IdP é a autoridade de credenciais |
| Endpoints OIDC manuais como padrão | Discovery via `/.well-known/openid-configuration` é o padrão; manual só se discovery indisponível |
