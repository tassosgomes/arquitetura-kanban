import "dotenv/config";
import { createPrismaClient } from "../src/infrastructure/db/create-prisma-client";
import { seedArchitectureDomains } from "../src/infrastructure/db/seed-architecture-domains";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed");
  }

  const prisma = createPrismaClient(databaseUrl);
  try {
    await seedArchitectureDomains(prisma);
    console.info("Seeded architecture domains (idempotent, 6 PRD names).");
  } finally {
    await prisma.$disconnect();
  }
}

void main();
