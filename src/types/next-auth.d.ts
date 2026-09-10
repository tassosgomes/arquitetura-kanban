import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    localUserId?: string;
    issuer?: string;
    subject?: string;
    email?: string;
    displayName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    localUserId?: string;
    issuer?: string;
    subject?: string;
    email?: string;
    displayName?: string;
    /** Only for RP-initiated logout (`id_token_hint`). Never exposed on `session`. */
    idToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    localUserId?: string;
    issuer?: string;
    subject?: string;
    email?: string;
    displayName?: string;
    idToken?: string;
  }
}
