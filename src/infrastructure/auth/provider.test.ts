import { describe, expect, it } from "vitest";
import { AUTH_PROVIDER_ID, createCorporateProvider } from "./provider";

describe("createCorporateProvider", () => {
  const base = {
    issuer: "https://idp.example.test/oidc/",
    clientId: "client",
    clientSecret: "secret",
    scopes: "openid profile email",
  };

  it("configures a generic OIDC provider named SSO with PKCE", () => {
    const provider = createCorporateProvider(base);
    expect(provider.id).toBe(AUTH_PROVIDER_ID);
    expect(provider.id).toBe("corporate");
    expect(provider.name).toBe("SSO");
    expect(provider.type).toBe("oidc");
    expect(provider.issuer).toBe("https://idp.example.test/oidc");
    expect(provider.wellKnown).toBe(
      "https://idp.example.test/oidc/.well-known/openid-configuration",
    );
    expect(provider.checks).toEqual(["pkce"]);
    expect(provider.authorization).toEqual({ params: { scope: "openid profile email" } });
    expect(provider.token).toBeUndefined();
  });

  it("sets manual endpoints only when they are provided", () => {
    const provider = createCorporateProvider({
      ...base,
      authorizationEndpoint: "https://idp.example.test/authorize",
      tokenEndpoint: "https://idp.example.test/token",
      userinfoEndpoint: "https://idp.example.test/userinfo",
    });
    expect(provider.authorization).toEqual({
      url: "https://idp.example.test/authorize",
      params: { scope: "openid profile email" },
    });
    expect(provider.token).toBe("https://idp.example.test/token");
    expect(provider.userinfo).toBe("https://idp.example.test/userinfo");
  });
});
