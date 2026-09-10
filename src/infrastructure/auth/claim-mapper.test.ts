import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ClaimMappingError, mapOidcClaims } from "./claim-mapper";

const ISSUER = "https://idp.example.test/oidc";

describe("mapOidcClaims", () => {
  it("maps sub and iss and optional profile fields", () => {
    expect(
      mapOidcClaims(
        {
          sub: "user-1",
          iss: ISSUER,
          email: "ana@example.test",
          name: "Ana Silva",
          groups: ["architecture"],
        },
        ISSUER,
      ),
    ).toEqual({
      subject: "user-1",
      issuer: ISSUER,
      email: "ana@example.test",
      displayName: "Ana Silva",
      groups: ["architecture"],
    });
  });

  it("succeeds when optional claims are omitted", () => {
    expect(mapOidcClaims({ sub: "user-1", iss: ISSUER }, ISSUER)).toEqual({
      subject: "user-1",
      issuer: ISSUER,
    });
  });

  it("omits invalid email instead of failing", () => {
    expect(
      mapOidcClaims({ sub: "user-1", iss: ISSUER, email: "not-an-email" }, ISSUER),
    ).toEqual({
      subject: "user-1",
      issuer: ISSUER,
    });
  });

  it("rejects a missing sub", () => {
    expect(() => mapOidcClaims({ iss: ISSUER }, ISSUER)).toThrow(ClaimMappingError);
  });

  it("rejects a missing iss", () => {
    expect(() => mapOidcClaims({ sub: "user-1" }, ISSUER)).toThrow(ClaimMappingError);
  });

  it("rejects an issuer that diverges from OIDC_ISSUER after slash normalization", () => {
    expect(() =>
      mapOidcClaims({ sub: "user-1", iss: "https://other.example.test/oidc" }, ISSUER),
    ).toThrow(ClaimMappingError);

    expect(mapOidcClaims({ sub: "user-1", iss: `${ISSUER}/` }, ISSUER).issuer).toBe(ISSUER);
  });

  it("uses name, then preferred_username, then username for displayName", () => {
    expect(
      mapOidcClaims({ sub: "a", iss: ISSUER, preferred_username: "ana.s" }, ISSUER).displayName,
    ).toBe("ana.s");
    expect(
      mapOidcClaims({ sub: "a", iss: ISSUER, username: "ana.s" }, ISSUER).displayName,
    ).toBe("ana.s");
    expect(
      mapOidcClaims(
        { sub: "a", iss: ISSUER, name: "Ana", preferred_username: "ana.s", username: "x" },
        ISSUER,
      ).displayName,
    ).toBe("Ana");
  });

  it("omits malformed groups or roles instead of failing", () => {
    expect(
      mapOidcClaims({ sub: "user-1", iss: ISSUER, groups: "admins", roles: { n: 1 } }, ISSUER),
    ).toEqual({
      subject: "user-1",
      issuer: ISSUER,
    });

    expect(
      mapOidcClaims({ sub: "user-1", iss: ISSUER, roles: ["reader"] }, ISSUER).groups,
    ).toEqual(["reader"]);
  });

  it("does not branch on identity-product names", () => {
    const source = readFileSync(path.join(import.meta.dirname, "claim-mapper.ts"), "utf8");
    expect(source).not.toMatch(/logto/i);
    expect(source).not.toMatch(/cyberark/i);
    expect(source).not.toMatch(/\bif\s*\(.*provider/i);
  });
});
