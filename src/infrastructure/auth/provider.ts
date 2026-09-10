import "server-only";

/**
 * Auth.js v5 (next-auth canal v5/beta) is installed in T05.
 * T07 implements the OIDC Authorization Code flow, claim mapper, session and guards.
 * Provider id must stay generic (`corporate`), never `logto` or `cyberark`.
 */
export const AUTH_PROVIDER_ID = "corporate" as const;
