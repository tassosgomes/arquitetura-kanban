export type PersistedIdentityUser = {
  id: string;
  oidcIssuer: string;
  oidcSubject: string;
  email: string | null;
  displayName: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
};

export const identityUserSelect = {
  id: true,
  oidcIssuer: true,
  oidcSubject: true,
  email: true,
  displayName: true,
  isActive: true,
  lastLoginAt: true,
} as const;
