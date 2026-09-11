import "server-only";
import { getAppStatus } from "@/application/health/get-app-status";
import { requireActiveUser } from "@/infrastructure/auth/require-active-user";
import { prisma } from "@/infrastructure/db/prisma";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";
import { createPrismaValueDeliveryRepository } from "@/infrastructure/db/repositories/prisma-value-delivery-repository";
import { runAuditedMutation } from "@/infrastructure/db/audited-transaction";

const areaRepository = createPrismaAreaRepository(prisma);
const domainRepository = createPrismaDomainRepository(prisma);
const catalogUserRepository = createPrismaCatalogUserRepository(prisma);
const projectRepository = createPrismaProjectRepository(prisma);
const activityRepository = createPrismaActivityRepository(prisma);
const valueDeliveryRepository = createPrismaValueDeliveryRepository(prisma);

export {
  activityRepository,
  areaRepository,
  catalogUserRepository,
  domainRepository,
  getAppStatus,
  prisma,
  projectRepository,
  requireActiveUser,
  runAuditedMutation,
  valueDeliveryRepository,
};
