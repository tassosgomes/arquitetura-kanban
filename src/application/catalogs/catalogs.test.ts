import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ValidationError } from "@/domain/errors";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import {
  createArea,
  deactivateArea,
  listActiveAreas,
  listActiveDomains,
  listActiveUsers,
} from "@/application/catalogs";
import { createDomain } from "@/application/catalogs/commands/create-domain";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";

const actor = {
  id: "00000000-0000-4000-8000-000000000099",
  oidcIssuer: "https://catalog.test",
  oidcSubject: "catalog-actor",
  isActive: true as const,
};

describe("catalog services (postgres)", () => {
  let prisma: PrismaClient | undefined;
  const areaIds: string[] = [];
  const domainIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
      await prisma.architectureDomain.deleteMany({ where: { id: { in: domainIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  });

  it("rejects duplicate active area names using normalization", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }

    const areas = createPrismaAreaRepository(prisma);
    const suffix = randomUUID();
    const name = `T09 Área ${suffix}`;

    const created = await createArea(actor, { name }, areas);
    areaIds.push(created.id);

    await expect(
      createArea(actor, { name: ` ${name.toUpperCase()} ` }, areas),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("allows recreating an area name after inactivation", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }

    const areas = createPrismaAreaRepository(prisma);
    const suffix = randomUUID();
    const name = `T09 Área reinício ${suffix}`;

    const first = await createArea(actor, { name }, areas);
    areaIds.push(first.id);

    await deactivateArea(actor, { id: first.id }, areas);

    const second = await createArea(actor, { name }, areas);
    areaIds.push(second.id);

    expect(second.isActive).toBe(true);
    expect(normalizeCatalogName(second.name)).toBe(normalizeCatalogName(name));
  });

  it("listActive* excludes inactive records", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }

    const areas = createPrismaAreaRepository(prisma);
    const domains = createPrismaDomainRepository(prisma);
    const users = createPrismaCatalogUserRepository(prisma);
    const suffix = randomUUID();

    const area = await createArea(actor, { name: `T09 ativa ${suffix}` }, areas);
    const inactiveArea = await createArea(actor, { name: `T09 inativa ${suffix}` }, areas);
    areaIds.push(area.id, inactiveArea.id);
    await deactivateArea(actor, { id: inactiveArea.id }, areas);

    const domain = await createDomain(actor, { name: `T09 domínio ${suffix}` }, domains);
    domainIds.push(domain.id);
    await prisma.architectureDomain.update({
      where: { id: domain.id },
      data: { isActive: false },
    });

    const activeUser = await prisma.user.create({
      data: {
        oidcIssuer: `https://t09.test/${suffix}`,
        oidcSubject: `active-${suffix}`,
        displayName: "T09 Ativo",
        isActive: true,
      },
    });
    const inactiveUser = await prisma.user.create({
      data: {
        oidcIssuer: `https://t09.test/${suffix}`,
        oidcSubject: `inactive-${suffix}`,
        displayName: "T09 Inativo",
        isActive: false,
      },
    });
    userIds.push(activeUser.id, inactiveUser.id);

    const activeAreas = await listActiveAreas(actor, areas);
    const activeDomains = await listActiveDomains(actor, domains);
    const activeUsers = await listActiveUsers(actor, users);

    expect(activeAreas.some((item) => item.id === area.id)).toBe(true);
    expect(activeAreas.some((item) => item.id === inactiveArea.id)).toBe(false);
    expect(activeDomains.some((item) => item.id === domain.id)).toBe(false);
    expect(activeUsers.some((item) => item.id === activeUser.id)).toBe(true);
    expect(activeUsers.some((item) => item.id === inactiveUser.id)).toBe(false);
  });
});
