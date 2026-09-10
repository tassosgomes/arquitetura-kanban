import { ForbiddenError, UnauthorizedError } from "@/domain/errors";
import type { LocalUser } from "@/domain/identity/local-user";

export type GuardSession = {
  localUserId: string;
} | null;

export type GuardUserRecord = {
  id: string;
  oidcIssuer: string;
  oidcSubject: string;
  email: string | null;
  displayName: string | null;
  isActive: boolean;
};

export function toLocalUser(user: GuardUserRecord): LocalUser {
  if (!user.isActive) {
    throw new ForbiddenError();
  }

  const local: LocalUser = {
    id: user.id,
    oidcIssuer: user.oidcIssuer,
    oidcSubject: user.oidcSubject,
    isActive: true,
  };

  if (user.email) {
    local.email = user.email;
  }
  if (user.displayName) {
    local.displayName = user.displayName;
  }

  return local;
}

/**
 * Authorization guard (identity.md §5.2). Reusable by T08, CSV and SSE.
 *
 * - No / expired session → `UnauthorizedError`
 * - Inactive user or missing `User` row → `ForbiddenError` (after `onForbidden`)
 * - Success → `LocalUser` with `isActive: true`
 *
 * `isActive` must be read from persistence, never trusted from the JWT alone.
 */
export async function requireActiveUserFrom(input: {
  session: GuardSession;
  loadUser: (id: string) => Promise<GuardUserRecord | null>;
  onForbidden?: () => Promise<void>;
}): Promise<LocalUser> {
  const localUserId = input.session?.localUserId?.trim();
  if (!localUserId) {
    throw new UnauthorizedError();
  }

  const user = await input.loadUser(localUserId);
  if (!user || !user.isActive) {
    await input.onForbidden?.();
    throw new ForbiddenError();
  }

  return toLocalUser(user);
}
