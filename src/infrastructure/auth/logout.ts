import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getToken } from "next-auth/jwt";
import { env } from "@/config/env";
import { signOut } from "./auth";
import { buildRpLogoutUrl, resolveEndSessionEndpoint } from "./oidc-logout";

export async function signOutFromApp(): Promise<void> {
  const headerList = await headers();
  const secureCookie = env.APP_URL.startsWith("https://");
  const token = await getToken({
    req: { headers: headerList },
    secret: env.AUTH_SECRET,
    secureCookie,
  });
  const idTokenHint = typeof token?.idToken === "string" ? token.idToken : undefined;

  const endSession = await resolveEndSessionEndpoint({
    issuer: env.OIDC_ISSUER,
    logoutEndpoint: env.OIDC_LOGOUT_ENDPOINT,
  });

  await signOut({ redirect: false });

  if (endSession) {
    redirect(
      buildRpLogoutUrl({
        endSessionEndpoint: endSession,
        postLogoutRedirectUri: `${env.APP_URL}/`,
        clientId: env.OIDC_CLIENT_ID,
        idTokenHint,
      }),
    );
  }

  console.info("OIDC end_session_endpoint unavailable; completing local logout only");
  redirect("/");
}
