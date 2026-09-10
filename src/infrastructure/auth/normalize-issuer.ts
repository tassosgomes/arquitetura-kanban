/** Trailing slash does not distinguish issuers (identity.md §2 / §3.2). */
export function normalizeIssuer(value: string): string {
  return value.trim().replace(/\/+$/, "");
}
