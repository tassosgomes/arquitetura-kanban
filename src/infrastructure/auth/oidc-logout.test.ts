import { describe, expect, it, vi } from "vitest";
import { buildRpLogoutUrl, resolveEndSessionEndpoint } from "./oidc-logout";

describe("oidc logout helpers", () => {
  it("builds RP-initiated logout with client_id, post_logout and optional id_token_hint", () => {
    const url = new URL(
      buildRpLogoutUrl({
        endSessionEndpoint: "https://idp.example.test/oidc/session/end",
        postLogoutRedirectUri: "http://localhost:3000/",
        clientId: "app-client",
        idTokenHint: "hint-token",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://idp.example.test/oidc/session/end");
    expect(url.searchParams.get("post_logout_redirect_uri")).toBe("http://localhost:3000/");
    expect(url.searchParams.get("client_id")).toBe("app-client");
    expect(url.searchParams.get("id_token_hint")).toBe("hint-token");
  });

  it("prefers an explicit logout endpoint over discovery", async () => {
    const fetchImpl = vi.fn();
    await expect(
      resolveEndSessionEndpoint({
        issuer: "https://idp.example.test/oidc",
        logoutEndpoint: "https://idp.example.test/end",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBe("https://idp.example.test/end");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads end_session_endpoint from discovery JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ end_session_endpoint: "https://idp.example.test/oidc/session/end" }),
    });
    await expect(
      resolveEndSessionEndpoint({
        issuer: "https://idp.example.test/oidc/",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBe("https://idp.example.test/oidc/session/end");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://idp.example.test/oidc/.well-known/openid-configuration",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("falls back when discovery fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    await expect(
      resolveEndSessionEndpoint({
        issuer: "https://idp.example.test/oidc",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBeUndefined();
  });
});
