import "server-only";
import { getAppStatus } from "@/application/health/get-app-status";
import { requireActiveUser } from "@/infrastructure/auth/require-active-user";
import { prisma } from "@/infrastructure/db/prisma";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { runAuditedMutation } from "@/infrastructure/db/audited-transaction";

const areaRepository = createPrismaAreaRepository(prisma);
const domainRepository = createPrismaDomainRepository(prisma);
const catalogUserRepository = createPrismaCatalogUserRepository(prisma);

export {
  areaRepository,
  catalogUserRepository,
  domainRepository,
  getAppStatus,
  requireActiveUser,
  runAuditedMutation,
};
