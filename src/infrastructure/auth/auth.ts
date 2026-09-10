import "server-only";
import NextAuth from "next-auth";
import { env } from "@/config/env";
import { prisma } from "@/infrastructure/db/prisma";
import { ClaimMappingError, mapOidcClaims } from "./claim-mapper";
import { mergeOidcClaims } from "./merge-oidc-claims";
import { AUTH_PROVIDER_ID, createCorporateProvider } from "./provider";
import { provisionLocalUser } from "./provision-local-user";

process.env.AUTH_URL ??= env.APP_URL;
process.env.AUTH_SECRET ??= env.AUTH_SECRET;
process.env.AUTH_TRUST_HOST ??= "true";

function identityFromCallback(
  profile: Record<string, unknown> | undefined,
  idToken: string | undefined,
) {
  return mapOidcClaims(mergeOidcClaims(profile, idToken), env.OIDC_ISSUER);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    createCorporateProvider({
      issuer: env.OIDC_ISSUER,
      clientId: env.OIDC_CLIENT_ID,
      clientSecret: env.OIDC_CLIENT_SECRET,
      scopes: env.OIDC_SCOPES,
      authorizationEndpoint: env.OIDC_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: env.OIDC_TOKEN_ENDPOINT,
      userinfoEndpoint: env.OIDC_USERINFO_ENDPOINT,
    }),
  ],
  callbacks: {
    async signIn({ profile, account }) {
      if (account?.provider !== AUTH_PROVIDER_ID) {
        return false;
      }

      try {
        const identity = identityFromCallback(
          profile as Record<string, unknown> | undefined,
          account.id_token,
        );
        const existing = await prisma.user.findUnique({
          where: {
            oidcIssuer_oidcSubject: {
              oidcIssuer: identity.issuer,
              oidcSubject: identity.subject,
            },
          },
          select: { isActive: true },
        });
        if (existing && !existing.isActive) {
          return "/403";
        }
        return true;
      } catch (error) {
        if (error instanceof ClaimMappingError) {
          return false;
        }
        throw error;
      }
    },
    async jwt({ token, account, profile, trigger }) {
      if (trigger === "signIn" || trigger === "signUp") {
        const identity = identityFromCallback(
          profile as Record<string, unknown> | undefined,
          account?.id_token,
        );
        const outcome = await provisionLocalUser(prisma, identity);
        if (outcome.status === "inactive") {
          return null;
        }

        return {
          localUserId: outcome.user.id,
          issuer: outcome.user.oidcIssuer,
          subject: outcome.user.oidcSubject,
          email: outcome.user.email ?? undefined,
          displayName: outcome.user.displayName ?? undefined,
          name: outcome.user.displayName,
          idToken: account?.id_token,
        };
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.localUserId || !token.issuer || !token.subject) {
        return session;
      }

      session.localUserId = token.localUserId;
      session.issuer = token.issuer;
      session.subject = token.subject;
      session.email = token.email;
      session.displayName = token.displayName;
      session.user = {
        ...session.user,
        name: token.displayName ?? session.user.name,
        email: token.email ?? session.user.email,
        image: null,
      };
      return session;
    },
  },
});
