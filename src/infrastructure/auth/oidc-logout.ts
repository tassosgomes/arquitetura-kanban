import { normalizeIssuer } from "./normalize-issuer";

export function buildRpLogoutUrl(input: {
  endSessionEndpoint: string;
  postLogoutRedirectUri: string;
  clientId: string;
  idTokenHint?: string;
}): string {
  const url = new URL(input.endSessionEndpoint);
  url.searchParams.set("post_logout_redirect_uri", input.postLogoutRedirectUri);
  url.searchParams.set("client_id", input.clientId);
  if (input.idTokenHint) {
    url.searchParams.set("id_token_hint", input.idTokenHint);
  }
  return url.toString();
}

export async function resolveEndSessionEndpoint(input: {
  issuer: string;
  logoutEndpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<string | undefined> {
  if (input.logoutEndpoint) {
    return input.logoutEndpoint;
  }

  const wellKnown = `${normalizeIssuer(input.issuer)}/.well-known/openid-configuration`;
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetchImpl(wellKnown, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return undefined;
    }
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "end_session_endpoint" in body &&
      typeof body.end_session_endpoint === "string" &&
      body.end_session_endpoint.length > 0
    ) {
      return body.end_session_endpoint;
    }
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }

  return undefined;
}
