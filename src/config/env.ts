import "server-only";
import { envSchema, type Env } from "@/config/env-schema";

function formatEnvError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    return (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
  }

  return error instanceof Error ? error.message : "Invalid environment";
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${formatEnvError(parsed.error)}`);
  }

  return parsed.data;
}

export const env = loadEnv();
