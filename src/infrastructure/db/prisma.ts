import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/config/env";
import { createPrismaClient } from "./create-prisma-client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient(env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
