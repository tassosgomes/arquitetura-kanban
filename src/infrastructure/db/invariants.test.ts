import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/infrastructure/db/create-prisma-client";
import { seedArchitectureDomains } from "@/infrastructure/db/seed-architecture-domains";
import { ARCHITECTURE_DOMAIN_NAMES } from "@/domain/catalog/architecture-domains";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";

const INVARIANTS_TEST_ISSUER = "https://integration-tests.invalid/kux-15/invariants";
const UNIQUE_IDENTITY_ISSUER = `${INVARIANTS_TEST_ISSUER}/unique-identity`;
const CHECK_FIXTURE_ISSUER = `${INVARIANTS_TEST_ISSUER}/activity-check`;
const CHECK_AREA_NAME = "KUX-15 integration check area";
const CHECK_DOMAIN_NAME = "KUX-15 integration check domain";
const CHECK_PROJECT_NAME = "KUX-15 integration check project";
const CHECK_ACTIVITY_TITLE = "KUX-15 integration check activity";
const CHECK_AD_HOC_TITLE = "KUX-15 integration ad hoc activity";
const REUSABLE_AREA_NAME = "KUX-15 integration reusable area";

function isCiEnv(): boolean {
  return process.env.CI === "true" || process.env.CI === "1";
}

/**
 * Local integration tests must use a disposable database. CI already provides
 * one through DATABASE_URL, so only CI may use that fallback.
 */
async function connectIntegrationDatabase(): Promise<PrismaClient | undefined> {
  const url = process.env.TEST_DATABASE_URL?.trim() || (isCiEnv() ? process.env.DATABASE_URL : undefined);
  if (!url) {
    if (isCiEnv()) {
      throw new Error("CI requires DATABASE_URL and a reachable PostgreSQL for integration tests.");
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
      throw new Error("CI requires a reachable PostgreSQL for integration tests.");
    }
    return undefined;
  }
}

async function deleteCheckFixture(prisma: PrismaClient): Promise<void> {
  const [users, areas, domains, projects, activities] = await Promise.all([
    prisma.user.findMany({ where: { oidcIssuer: CHECK_FIXTURE_ISSUER }, select: { id: true } }),
    prisma.area.findMany({
      where: { nameNormalized: normalizeCatalogName(CHECK_AREA_NAME) },
      select: { id: true },
    }),
    prisma.architectureDomain.findMany({
      where: { nameNormalized: normalizeCatalogName(CHECK_DOMAIN_NAME) },
      select: { id: true },
    }),
    prisma.project.findMany({
      where: { nameNormalized: normalizeCatalogName(CHECK_PROJECT_NAME) },
      select: { id: true },
    }),
    prisma.activity.findMany({
      where: { title: { in: [CHECK_ACTIVITY_TITLE, CHECK_AD_HOC_TITLE] } },
      select: { id: true },
    }),
  ]);
  const userIds = users.map(({ id }) => id);
  const areaIds = areas.map(({ id }) => id);
  const domainIds = domains.map(({ id }) => id);
  const projectIds = projects.map(({ id }) => id);
  const activityIds = activities.map(({ id }) => id);

  await prisma.activityParticipant.deleteMany({ where: { activityId: { in: activityIds } } });
  await prisma.activityInvolvedArea.deleteMany({ where: { activityId: { in: activityIds } } });
  await prisma.activityTask.deleteMany({ where: { activityId: { in: activityIds } } });
  await prisma.projectParticipant.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.valueDelivery.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.auditEvent.deleteMany({
    where: {
      OR: [
        { activityId: { in: activityIds } },
        { projectId: { in: projectIds } },
        { actorUserId: { in: userIds } },
      ],
    },
  });
  await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.architectureDomain.deleteMany({ where: { id: { in: domainIds } } });
  await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

/**
 * Invariantes que exigem PostgreSQL. Sem banco alcançável, os casos são ignorados
 * no laptop (os testes unitários de nameNormalized / vínculo tipo-projeto ainda rodam).
 * No CI (`CI=true`) o Postgres é obrigatório: a suíte falha em vez de pular.
 */
describe("relational invariants (postgres)", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    prisma = await connectIntegrationDatabase();
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
    const issuer = UNIQUE_IDENTITY_ISSUER;
    const email = "kux-15-unique@example.test";
    const createdIds: string[] = [];

    try {
      await prisma.user.deleteMany({ where: { oidcIssuer: issuer } });
      const first = await prisma.user.create({
        data: {
          oidcIssuer: issuer,
          oidcSubject: "subject-a",
          email,
          displayName: "KUX-15 integration identity A",
        },
      });
      createdIds.push(first.id);

      const second = await prisma.user.create({
        data: {
          oidcIssuer: issuer,
          oidcSubject: "subject-b",
          email,
          displayName: "KUX-15 integration identity B",
        },
      });
      createdIds.push(second.id);

      await expect(
        prisma.user.create({
          data: {
            oidcIssuer: issuer,
            oidcSubject: "subject-a",
            email: "kux-15-other@example.test",
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
    await deleteCheckFixture(prisma);
    const user = await prisma.user.create({
      data: {
        oidcIssuer: CHECK_FIXTURE_ISSUER,
        oidcSubject: "activity-check",
        displayName: "KUX-15 integration activity actor",
      },
    });
    const area = await prisma.area.create({
      data: {
        name: CHECK_AREA_NAME,
        nameNormalized: normalizeCatalogName(CHECK_AREA_NAME),
      },
    });
    const domain = await prisma.architectureDomain.create({
      data: {
        name: CHECK_DOMAIN_NAME,
        nameNormalized: normalizeCatalogName(CHECK_DOMAIN_NAME),
      },
    });
    const project = await prisma.project.create({
      data: {
        name: CHECK_PROJECT_NAME,
        nameNormalized: normalizeCatalogName(CHECK_PROJECT_NAME),
        responsibleAreaId: area.id,
        nature: "STRATEGIC",
        architectureRole: "RESPONSIBLE",
        status: "PLANNED",
        createdById: user.id,
        updatedById: user.id,
      },
    });
    try {
      const baseActivity = {
        title: CHECK_ACTIVITY_TITLE,
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

      await prisma.activity.create({
        data: { ...baseActivity, type: "PROJECT", projectId: project.id },
      });
      await prisma.activity.create({
        data: {
          ...baseActivity,
          title: CHECK_AD_HOC_TITLE,
          type: "AD_HOC",
          projectId: null,
        },
      });
    } finally {
      await deleteCheckFixture(prisma);
    }
  });

  it("partial unique allows reusing an inactive area name", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const name = REUSABLE_AREA_NAME;
    const nameNormalized = normalizeCatalogName(name);
    const ids: string[] = [];

    try {
      await prisma.area.deleteMany({ where: { nameNormalized } });
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
