import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/infrastructure/db/create-prisma-client";

function isCiEnv(): boolean {
  return process.env.CI === "true" || process.env.CI === "1";
}

/**
 * In CI, PostgreSQL must be reachable. Local `npm test` may skip integration
 * cases when the database is down; GitHub Actions must not mask that.
 */
export async function assertPostgresReachableInCi(): Promise<void> {
  if (!isCiEnv()) {
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "CI requires DATABASE_URL and a reachable PostgreSQL; skipping integration tests would mask failures.",
    );
  }

  const client = createPrismaClient(url);
  try {
    await client.$queryRaw`SELECT 1`;
  } catch {
    throw new Error(
      "CI requires a reachable PostgreSQL (service container). Skipping integration tests would mask failures.",
    );
  } finally {
    await client.$disconnect().catch(() => undefined);
  }
}

export async function connectPostgresForTests(): Promise<PrismaClient | undefined> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (isCiEnv()) {
      throw new Error(
        "CI requires DATABASE_URL and a reachable PostgreSQL; skipping integration tests would mask failures.",
      );
    }
    return undefined;
  }

  const client = createPrismaClient(url);
  try {
    await client.$queryRaw`SELECT 1`;
    return client;
  } catch {
    await client.$disconnect().catch(() => undefined);
    if (isCiEnv()) {
      throw new Error(
        "CI requires a reachable PostgreSQL (service container). Skipping integration tests would mask failures.",
      );
    }
    return undefined;
  }
}
