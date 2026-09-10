import type { PrismaClient } from "@/generated/prisma/client";
import type { AuthenticatedIdentity } from "@/domain/identity/authenticated-identity";
import {
  identityUserSelect,
  type PersistedIdentityUser,
} from "./persisted-identity-user";

export type ProvisionOutcome =
  | { status: "active"; user: PersistedIdentityUser }
  | { status: "inactive"; user: PersistedIdentityUser };

function profileFields(identity: AuthenticatedIdentity) {
  return {
    email: identity.email ?? null,
    displayName: identity.displayName ?? null,
  };
}

/**
 * First authorized login / subsequent login (identity.md §4).
 * Key is issuer+subject. Email never merges accounts.
 */
export async function provisionLocalUser(
  prisma: PrismaClient,
  identity: AuthenticatedIdentity,
  now: Date = new Date(),
): Promise<ProvisionOutcome> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: {
        oidcIssuer_oidcSubject: {
          oidcIssuer: identity.issuer,
          oidcSubject: identity.subject,
        },
      },
      select: identityUserSelect,
    });

    if (!existing) {
      const created = await tx.user.create({
        data: {
          oidcIssuer: identity.issuer,
          oidcSubject: identity.subject,
          ...profileFields(identity),
          isActive: true,
          lastLoginAt: now,
        },
        select: identityUserSelect,
      });
      return { status: "active", user: created };
    }

    if (!existing.isActive) {
      return { status: "inactive", user: existing };
    }

    const updated = await tx.user.update({
      where: { id: existing.id },
      data: {
        ...profileFields(identity),
        lastLoginAt: now,
      },
      select: identityUserSelect,
    });
    return { status: "active", user: updated };
  });
}
