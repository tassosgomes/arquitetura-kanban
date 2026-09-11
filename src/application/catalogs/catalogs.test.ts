import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ValidationError } from "@/domain/errors";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import {
  createArea,
  deactivateArea,
  listActiveAreas,
  listActiveDomains,
  listActiveUsers,
  renameArea,
} from "@/application/catalogs";
import {
  createDomain,
  deactivateDomain,
  renameDomain,
} from "@/application/catalogs/commands/create-domain";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";

describe("catalog services (postgres)", () => {
  let prisma: PrismaClient | undefined;
  let actor: LocalUser | undefined;
  const areaIds: string[] = [];
  const domainIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
    if (!prisma) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://catalog.test/${randomUUID()}`,
        oidcSubject: "catalog-actor",
        displayName: "Catalog actor",
      },
    });
    userIds.push(user.id);
    actor = {
      id: user.id,
      oidcIssuer: user.oidcIssuer,
      oidcSubject: user.oidcSubject,
      isActive: true,
    };
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.auditEvent.deleteMany({
        where: { actorUserId: { in: userIds } },
      });
      await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
      await prisma.architectureDomain.deleteMany({ where: { id: { in: domainIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  });

  it("rejects duplicate active area names using normalization", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const areas = createPrismaAreaRepository(prisma);
    const suffix = randomUUID();
    const name = `T09 Área ${suffix}`;

    const created = await createArea(actor, { name }, areas, prisma);
    areaIds.push(created.id);

    await expect(
      createArea(actor, { name: ` ${name.toUpperCase()} ` }, areas, prisma),
    ).rejects.toBeInstanceOf(ValidationError);

    const events = await prisma.auditEvent.findMany({ where: { entityId: created.id } });
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe("created");
  });

  it("allows recreating an area name after inactivation", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const areas = createPrismaAreaRepository(prisma);
    const suffix = randomUUID();
    const name = `T09 Área reinício ${suffix}`;

    const first = await createArea(actor, { name }, areas, prisma);
    areaIds.push(first.id);

    await deactivateArea(actor, { id: first.id }, areas, prisma);

    const second = await createArea(actor, { name }, areas, prisma);
    areaIds.push(second.id);

    expect(second.isActive).toBe(true);
    expect(normalizeCatalogName(second.name)).toBe(normalizeCatalogName(name));
  });

  it("audits create, rename and deactivate of area and domain", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const areas = createPrismaAreaRepository(prisma);
    const domains = createPrismaDomainRepository(prisma);
    const suffix = randomUUID();

    const area = await createArea(actor, { name: `T12 Área audit ${suffix}` }, areas, prisma);
    areaIds.push(area.id);
    const renamedArea = await renameArea(
      actor,
      { id: area.id, name: `T12 Área audit nova ${suffix}` },
      areas,
      prisma,
    );
    const deactivatedArea = await deactivateArea(actor, { id: area.id }, areas, prisma);
    expect(deactivatedArea.isActive).toBe(false);
    expect(renamedArea.name).toContain("nova");

    const alreadyInactive = await deactivateArea(actor, { id: area.id }, areas, prisma);
    expect(alreadyInactive.isActive).toBe(false);

    const domain = await createDomain(actor, { name: `T12 domínio audit ${suffix}` }, domains, prisma);
    domainIds.push(domain.id);
    await renameDomain(
      actor,
      { id: domain.id, name: `T12 domínio audit novo ${suffix}` },
      domains,
      prisma,
    );
    await deactivateDomain(actor, { id: domain.id }, domains, prisma);

    const areaEvents = await prisma.auditEvent.findMany({
      where: { entityId: area.id },
      orderBy: [{ occurredAt: "asc" }, { sequence: "asc" }],
    });
    expect(areaEvents.map((event) => event.action)).toEqual([
      "created",
      "field_changed",
      "deactivated",
    ]);
    expect(areaEvents[0]?.entityKind).toBe("Area");
    expect(areaEvents[0]?.changes).toMatchObject({
      snapshot: { name: `T12 Área audit ${suffix}`, isActive: true },
      fields: {
        name: { before: null, after: `T12 Área audit ${suffix}` },
        isActive: { before: null, after: true },
      },
    });
    expect(areaEvents[1]?.changes).toMatchObject({
      fields: {
        name: {
          before: `T12 Área audit ${suffix}`,
          after: `T12 Área audit nova ${suffix}`,
        },
      },
    });
    expect(areaEvents[2]?.changes).toMatchObject({
      fields: { isActive: { before: true, after: false } },
    });

    const domainEvents = await prisma.auditEvent.findMany({
      where: { entityId: domain.id },
      orderBy: [{ occurredAt: "asc" }, { sequence: "asc" }],
    });
    expect(domainEvents.map((event) => event.action)).toEqual([
      "created",
      "field_changed",
      "deactivated",
    ]);
    expect(domainEvents[0]?.entityKind).toBe("Domain");
  });

  it("listActive* excludes inactive records", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const areas = createPrismaAreaRepository(prisma);
    const domains = createPrismaDomainRepository(prisma);
    const users = createPrismaCatalogUserRepository(prisma);
    const suffix = randomUUID();

    const area = await createArea(actor, { name: `T09 ativa ${suffix}` }, areas, prisma);
    const inactiveArea = await createArea(actor, { name: `T09 inativa ${suffix}` }, areas, prisma);
    areaIds.push(area.id, inactiveArea.id);
    await deactivateArea(actor, { id: inactiveArea.id }, areas, prisma);

    const domain = await createDomain(actor, { name: `T09 domínio ${suffix}` }, domains, prisma);
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
