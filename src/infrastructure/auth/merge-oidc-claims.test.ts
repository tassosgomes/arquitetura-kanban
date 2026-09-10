import { describe, expect, it } from "vitest";
import { mergeOidcClaims } from "./merge-oidc-claims";

function encodePayload(payload: Record<string, unknown>): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${json}.sig`;
}

describe("mergeOidcClaims", () => {
  it("lets ID Token claims override the userinfo profile for sub and iss", () => {
    const idToken = encodePayload({
      sub: "from-token",
      iss: "https://idp.example.test/oidc",
      email: "token@example.test",
    });

    expect(
      mergeOidcClaims(
        { sub: "from-profile", iss: "https://wrong.example.test", name: "Ana" },
        idToken,
      ),
    ).toMatchObject({
      sub: "from-token",
      iss: "https://idp.example.test/oidc",
      email: "token@example.test",
      name: "Ana",
    });
  });
});
