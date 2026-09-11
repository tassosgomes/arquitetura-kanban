import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const inCi = Boolean(process.env.CI);
const e2eOrigin = new URL(BASE_URL);
const e2eHost = e2eOrigin.hostname;
const e2ePort = e2eOrigin.port || "3000";

function webServerEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  env.APP_URL = BASE_URL.replace(/\/$/, "");
  env.APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? "America/Sao_Paulo";
  env.DATABASE_URL =
    process.env.DATABASE_URL ??
    "postgresql://arquitetura:ci_password@127.0.0.1:5432/arquitetura_ci";
  env.OIDC_ISSUER = process.env.OIDC_ISSUER ?? "https://ci.example.test/oidc";
  env.OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID ?? "ci-dummy-client";
  env.OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET ?? "ci-dummy-secret";
  env.OIDC_SCOPES = process.env.OIDC_SCOPES ?? "openid profile email";
  env.AUTH_SECRET = process.env.AUTH_SECRET ?? "ci-dummy-auth-secret-min-32-chars!!";
  env.NEXT_TELEMETRY_DISABLED = "1";
  return env;
}

/**
 * Public E2E (T28). Dummy OIDC is enough for /login, /403, and unauthenticated
 * CSV/SSE. The authenticated product flow is skipped until Logto is provisioned
 * (ADR-018: do not mark login as validated with a forged session).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: inCi,
  retries: inCi ? 1 : 0,
  workers: inCi ? 1 : undefined,
  reporter: inCi ? [["list"], ["github"]] : "list",
  outputDir: "test-results",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "pt-BR",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `HOSTNAME=${e2eHost} PORT=${e2ePort} node scripts/e2e-webserver.mjs`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: !inCi,
    timeout: 120_000,
    env: webServerEnv(),
  },
});
