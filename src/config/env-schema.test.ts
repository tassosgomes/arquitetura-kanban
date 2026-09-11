import { describe, expect, it } from "vitest";
import { envSchema } from "@/config/env-schema";
import { ConflictError, UnauthorizedError } from "@/domain/errors";

const validEnv = {
  APP_URL: "http://localhost:3000",
  APP_TIME_ZONE: "America/Sao_Paulo",
  DATABASE_URL: "postgresql://arquitetura:CHANGEME@localhost:5432/arquitetura",
  OIDC_ISSUER: "https://your-tenant.logto.app/oidc",
  OIDC_CLIENT_ID: "local-client",
  OIDC_CLIENT_SECRET: "local-secret",
  OIDC_SCOPES: "openid profile email",
  AUTH_SECRET: "replace-with-openssl-rand-base64-32-chars-min",
};

describe("smoke: local bootstrap contracts", () => {
  it("parses the documented local environment fixture", () => {
    const parsed = envSchema.parse(validEnv);
    expect(parsed.APP_TIME_ZONE).toBe("America/Sao_Paulo");
    expect(parsed.APP_URL).toBe("http://localhost:3000");
    expect(parsed.DATABASE_URL_LISTEN).toBeUndefined();
  });

  it("accepts optional DATABASE_URL_LISTEN for the SSE LISTEN session", () => {
    const parsed = envSchema.parse({
      ...validEnv,
      DATABASE_URL_LISTEN: "postgresql://arquitetura:CHANGEME@localhost:5432/arquitetura",
    });
    expect(parsed.DATABASE_URL_LISTEN).toBe(
      "postgresql://arquitetura:CHANGEME@localhost:5432/arquitetura",
    );
  });

  it("exposes application errors without leaking infrastructure details", () => {
    expect(new UnauthorizedError().code).toBe("UNAUTHORIZED");
    expect(new ConflictError().code).toBe("CONFLICT");
  });
});
