import type { OIDCConfig } from "next-auth/providers";
import type { Profile } from "next-auth";
import { normalizeIssuer } from "./normalize-issuer";

/**
 * Auth.js v5 generic OIDC provider. Id stays `corporate` across environments.
 * Discovery: `{issuer}/.well-known/openid-configuration`. Manual endpoints
 * only when the optional env values are present.
 */
export const AUTH_PROVIDER_ID = "corporate" as const;

export type CorporateProviderInput = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
};

export function createCorporateProvider(input: CorporateProviderInput): OIDCConfig<Profile> {
  const issuer = normalizeIssuer(input.issuer);
  const authorization = input.authorizationEndpoint
    ? { url: input.authorizationEndpoint, params: { scope: input.scopes } }
    : { params: { scope: input.scopes } };

  return {
    id: AUTH_PROVIDER_ID,
    name: "SSO",
    type: "oidc",
    issuer,
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    checks: ["pkce"],
    client: {
      token_endpoint_auth_method: "client_secret_basic",
    },
    authorization,
    ...(input.tokenEndpoint ? { token: input.tokenEndpoint } : {}),
    ...(input.userinfoEndpoint ? { userinfo: input.userinfoEndpoint } : {}),
    profile(profile) {
      return {
        id: typeof profile.sub === "string" ? profile.sub : "",
        name: null,
        email: null,
        image: null,
      };
    },
  };
}
