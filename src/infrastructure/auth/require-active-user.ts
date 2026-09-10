import "server-only";
import type { LocalUser } from "@/domain/identity/local-user";
import { prisma } from "@/infrastructure/db/prisma";
import { requireActiveUserFrom } from "./active-user-guard";
import { auth, signOut } from "./auth";
import { identityUserSelect } from "./persisted-identity-user";

/**
 * Contract for T08 / CSV / SSE:
 *
 * ```ts
 * requireActiveUser(): Promise<LocalUser>
 * ```
 *
 * Reads the Auth.js JWT session, then reloads `User.isActive` from the database
 * on every call. Throws `UnauthorizedError` without a session, `ForbiddenError`
 * when the local user is missing or inactive (and drops the session cookie).
 * The returned `LocalUser` always has `isActive: true`.
 */
export async function requireActiveUser(): Promise<LocalUser> {
  const session = await auth();

  return requireActiveUserFrom({
    session: session?.localUserId ? { localUserId: session.localUserId } : null,
    loadUser: (id) =>
      prisma.user.findUnique({
        where: { id },
        select: identityUserSelect,
      }),
    onForbidden: async () => {
      await signOut({ redirect: false });
    },
  });
}
