import type { AuthenticatedIdentity } from "@/domain/identity/authenticated-identity";
import { normalizeIssuer } from "./normalize-issuer";

export class ClaimMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimMappingError";
  }
}

function requiredClaim(value: unknown, claim: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ClaimMappingError(`Missing required claim: ${claim}`);
  }
  return value.trim();
}

function optionalEmail(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.includes("@")) {
    return undefined;
  }
  return trimmed;
}

function optionalDisplayName(claims: Record<string, unknown>): string | undefined {
  for (const key of ["name", "preferred_username", "username"] as const) {
    const value = claims[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return undefined;
  }
  return value;
}

/**
 * Unique module that reads OIDC claims. No product-specific branches.
 * `expectedIssuer` is `OIDC_ISSUER` of the environment (compared after slash normalization).
 */
export function mapOidcClaims(
  claims: Record<string, unknown>,
  expectedIssuer: string,
): AuthenticatedIdentity {
  const subject = requiredClaim(claims.sub, "sub");
  const issuer = normalizeIssuer(requiredClaim(claims.iss, "iss"));
  const expected = normalizeIssuer(expectedIssuer);

  if (!expected) {
    throw new ClaimMappingError("Configured issuer is empty");
  }

  if (issuer !== expected) {
    throw new ClaimMappingError("Issuer does not match the configured OIDC issuer");
  }

  const identity: AuthenticatedIdentity = { subject, issuer };

  const email = optionalEmail(claims.email);
  if (email) {
    identity.email = email;
  }

  const displayName = optionalDisplayName(claims);
  if (displayName) {
    identity.displayName = displayName;
  }

  const groups = optionalStringArray(claims.groups) ?? optionalStringArray(claims.roles);
  if (groups) {
    identity.groups = groups;
  }

  return identity;
}
