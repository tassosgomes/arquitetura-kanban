/**
 * Usuário local após o guard de autorização (T07).
 * `isActive: true` é invariante nessa fronteira; a persistência permite `false`.
 */
export type LocalUser = {
  id: string;
  oidcIssuer: string;
  oidcSubject: string;
  email?: string;
  displayName?: string;
  isActive: true;
};
