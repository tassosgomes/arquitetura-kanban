# ADR-015 — Auth.js v5 com provedor OIDC genérico

**Status:** Aceito
**Data:** 2026-09-10
**Task:** T01
**Consulta npm / Auth.js:** 2026-09-10

## Contexto

A autenticação é OIDC agnóstica ao IdP (ADR-012). Logto Cloud em DEV/TEST, CyberArk em PROD. O domínio só conhece `AuthenticatedIdentity`. Route Handlers cobrem o fluxo de auth.

A Tech Spec não escolheu a biblioteca. Em 10/09/2026:

- `next-auth@latest` = **4.24.15** (Pages Router / LTS antigo).
- Auth.js v5 = `next-auth@5.0.0-beta.32` (canal `@beta`), App Router, `type: "oidc"`, discovery.
- Auth.js está em manutenção (patches de segurança; sucessor anunciado: Better Auth).
- Better Auth **1.7.4** está estável e tem plugin `genericOAuth` com discovery.

O MVP já definiu o modelo `User` (`issuer` + `subject`) e sessão sem persistir tokens corporativos desnecessários.

## Decisão

Usar **Auth.js v5** (`next-auth` 5.0.0-beta.32 ou patch de segurança posterior no canal v5) com **um único provedor genérico**:

```typescript
{
  id: "corporate",
  name: "SSO",
  type: "oidc",
  issuer: env.OIDC_ISSUER,
  clientId: env.OIDC_CLIENT_ID,
  clientSecret: env.OIDC_CLIENT_SECRET,
  authorization: { params: { scope: env.OIDC_SCOPES } },
}
```

- Discovery em `{issuer}/.well-known/openid-configuration`. Endpoints manuais só se o discovery falhar (variáveis da Tech Spec).
- `profile` / claim mapper em `src/infrastructure/auth` produz `AuthenticatedIdentity`. Nada de claims brutos fora desse módulo.
- Sessão JWT em cookie HTTP-only. Conteúdo: usuário local + identidade normalizada. Sem access token. `id_token` somente se o logout OIDC exigir.
- Id do provedor **não** é `logto` nem `cyberark`. Troca de IdP = env + mapper, sem `if (provider === ...)`.
- Instalar pelo canal v5 (`next-auth@5` / `@beta`), nunca `next-auth@latest`.

T03 detalha callbacks, scopes e política. T07 implementa.

## Por que não Better Auth neste MVP

Better Auth atende OIDC genérico e está mais ativo. Foi recusado **por enquanto** porque:

1. Traz schema próprio (user / session / account) que competiria com o `User` da Tech Spec (`UNIQUE(oidcIssuer, oidcSubject)`).
2. Empurraria T06 a adaptar o modelo de identidade à lib, em vez da lib ao contrato já fechado.
3. Auth.js v5 cobre Authorization Code, PKCE, discovery, Route Handlers e sessão JWT sem tabela extra.

O adapter permanece atrás de `src/infrastructure/auth`. Se o canal v5 deixar de receber patches, T07/T29 podem substituir a lib sem mudar o domínio.

## Consequências

- Route Handler em `src/app/api/auth/[...nextauth]/route.ts`.
- Variáveis continuam `OIDC_*`, `AUTH_SECRET`, `APP_URL` — não `AUTH_LOGTO_*`.
- Testes do mapper usam fixtures de claims, não SDK de IdP.
- T05 não sobe IdP no Compose.

## Alternativas consideradas

| Alternativa | Motivo de recusa |
| --- | --- |
| Better Auth 1.7 | Schema/sessão próprios vs modelo User já fechado |
| `openid-client` / oauth4webapi direto | Cookies, CSRF, PKCE e sessão seriam manuais demais para o MVP |
| SDK Logto ou CyberArk | Viola ADR-012 |
| next-auth v4 | Não é o alvo do App Router |
