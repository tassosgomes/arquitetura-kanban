export type AuthenticatedIdentity = {
  subject: string;
  issuer: string;
  email?: string;
  displayName?: string;
  groups?: string[];
};
