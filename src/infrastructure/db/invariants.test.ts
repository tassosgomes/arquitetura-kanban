import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/infrastructure/db/create-prisma-client";
import { seedArchitectureDomains } from "@/infrastructure/db/seed-architecture-domains";
import { ARCHITECTURE_DOMAIN_NAMES } from "@/domain/catalog/architecture-domains";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";

/**
 * Invariantes que exigem PostgreSQL. Sem banco alcançável, os casos são ignorados
 * (os testes unitários de nameNormalized / vínculo tipo-projeto ainda rodam).
 */
describe("relational invariants (postgres)", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return;
    }
    const client = createPrismaClient(url);
    try {
      await client.$queryRaw`SELECT 1`;
      prisma = client;
    } catch {
      await client.$disconnect().catch(() => undefined);
    }
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("seed of the six domains is idempotent", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    await seedArchitectureDomains(prisma);
    await seedArchitectureDomains(prisma);

    const keys = ARCHITECTURE_DOMAIN_NAMES.map(normalizeCatalogName);
    const rows = await prisma.architectureDomain.findMany({
      where: { nameNormalized: { in: keys } },
    });
    const distinctKeys = new Set(rows.map((row) => row.nameNormalized));
    expect(distinctKeys.size).toBe(6);
    expect([...distinctKeys].sort()).toEqual([...keys].sort());
  });

  it("UNIQUE(oidcIssuer, oidcSubject) and non-unique email", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const issuer = `https://t06.test/${suffix}`;
    const email = `t06-${suffix}@example.test`;
    const createdIds: string[] = [];

    try {
      const first = await prisma.user.create({
        data: {
          oidcIssuer: issuer,
          oidcSubject: `sub-a-${suffix}`,
          email,
          displayName: "T06 fixture A",
        },
      });
      createdIds.push(first.id);

      const second = await prisma.user.create({
        data: {
          oidcIssuer: issuer,
          oidcSubject: `sub-b-${suffix}`,
          email,
          displayName: "T06 fixture B",
        },
      });
      createdIds.push(second.id);

      await expect(
        prisma.user.create({
          data: {
            oidcIssuer: issuer,
            oidcSubject: `sub-a-${suffix}`,
            email: `other-${suffix}@example.test`,
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    }
  });

  it("CHECK rejects PROJECT without projectId and AD_HOC with projectId", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t06.test/${suffix}`,
        oidcSubject: `sub-${suffix}`,
        displayName: "T06 activity fixture",
      },
    });
    const area = await prisma.area.create({
      data: {
        name: `T06 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T06 Área ${suffix}`),
      },
    });
    const domain = await prisma.architectureDomain.create({
      data: {
        name: `T06 Domínio ${suffix}`,
        nameNormalized: normalizeCatalogName(`T06 Domínio ${suffix}`),
      },
    });
    const project = await prisma.project.create({
      data: {
        name: `T06 Projeto ${suffix}`,
        nameNormalized: normalizeCatalogName(`T06 Projeto ${suffix}`),
        responsibleAreaId: area.id,
        architectureOwnerId: user.id,
        nature: "STRATEGIC",
        architectureRole: "RESPONSIBLE",
        status: "PLANNED",
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const activityIds: string[] = [];

    try {
      const baseActivity = {
        title: `T06 atividade ${suffix}`,
        requestingAreaId: area.id,
        nature: "OPERATIONAL" as const,
        domainId: domain.id,
        architectureRole: "CONTRIBUTOR" as const,
        ownerId: user.id,
        priority: "MEDIUM" as const,
        status: "BACKLOG" as const,
        createdById: user.id,
        updatedById: user.id,
      };

      await expect(
        prisma.activity.create({
          data: { ...baseActivity, type: "PROJECT", projectId: null },
        }),
      ).rejects.toThrow();

      await expect(
        prisma.activity.create({
          data: { ...baseActivity, type: "AD_HOC", projectId: project.id },
        }),
      ).rejects.toThrow();

      const projectActivity = await prisma.activity.create({
        data: { ...baseActivity, type: "PROJECT", projectId: project.id },
      });
      activityIds.push(projectActivity.id);
      const adHoc = await prisma.activity.create({
        data: {
          ...baseActivity,
          title: `T06 ad hoc ${suffix}`,
          type: "AD_HOC",
          projectId: null,
        },
      });
      activityIds.push(adHoc.id);
    } finally {
      await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
      await prisma.project.delete({ where: { id: project.id } });
      await prisma.architectureDomain.delete({ where: { id: domain.id } });
      await prisma.area.delete({ where: { id: area.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("partial unique allows reusing an inactive area name", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const name = `T06 Área única ${suffix}`;
    const nameNormalized = normalizeCatalogName(name);
    const ids: string[] = [];

    try {
      const first = await prisma.area.create({
        data: { name, nameNormalized },
      });
      ids.push(first.id);

      await expect(
        prisma.area.create({
          data: { name: name.toUpperCase(), nameNormalized },
        }),
      ).rejects.toThrow();

      await prisma.area.update({
        where: { id: first.id },
        data: { isActive: false },
      });

      const second = await prisma.area.create({
        data: { name, nameNormalized, isActive: true },
      });
      ids.push(second.id);
    } finally {
      await prisma.area.deleteMany({ where: { id: { in: ids } } });
    }
  });
});
