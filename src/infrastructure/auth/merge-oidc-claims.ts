function decodeJwtPayload(idToken: string): Record<string, unknown> {
  const payload = idToken.split(".")[1];
  if (!payload) {
    return {};
  }

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

/**
 * ID Token payload is the source of truth; userinfo/profile fills gaps.
 * Token is not verified here — Auth.js already validated it.
 */
export function mergeOidcClaims(
  profile: Record<string, unknown> | null | undefined,
  idToken: string | null | undefined,
): Record<string, unknown> {
  const fromProfile = profile ?? {};
  const fromToken = idToken ? decodeJwtPayload(idToken) : {};
  return { ...fromProfile, ...fromToken };
}
