import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ActivityStatus, ActivityType, KANBAN_COLUMN_STATUSES } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import type { Clock } from "@/application/ports/clock";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import { createActivity } from "@/application/activities";
import type { CreateActivityInput } from "@/application/activities";
import { computeManagementSnapshot } from "@/application/reports";
import { PeriodPreset, TemporalQueryMode } from "@/application/temporal";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaAuditRepository } from "@/infrastructure/db/repositories/prisma-audit-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";

/**
 * T28 mass snapshot — meta recorded **before** measurement (not a production SLA):
 * - Population: 48 activities (8 per Kanban column) intersecting THIS_MONTH
 * - Environment: PostgreSQL 17 used by Vitest (CI service or local DATABASE_URL)
 * - Success: snapshot I-01 and populationIds equal 48
 * - Time budget in this test env: complete in under 15 seconds
 */
const MASS_ACTIVITY_COUNT = 48;
const MASS_SNAPSHOT_BUDGET_MS = 15_000;
const NOW_ISO = "2026-09-10T15:00:00-03:00";

function clockAt(iso: string): Clock {
  return { now: () => new Date(iso) };
}

function scopeActivities(inner: ActivityRepository, ids: readonly string[]): ActivityRepository {
  const allowed = new Set(ids);
  return {
    ...inner,
    async list(filter) {
      const rows = await inner.list(filter);
      return rows.filter((row) => allowed.has(row.id));
    },
  };
}

describe("computeManagementSnapshot mass fixture (T28)", () => {
  let prisma: PrismaClient | undefined;
  let actor: LocalUser | undefined;
  const areaIds: string[] = [];
  const domainIds: string[] = [];
  const userIds: string[] = [];
  const activityIds: string[] = [];

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
    if (!prisma) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t28.mass/${randomUUID()}`,
        oidcSubject: "t28-mass-actor",
        displayName: "T28 mass actor",
        isActive: true,
      },
    });
    userIds.push(user.id);
    actor = {
      id: user.id,
      oidcIssuer: user.oidcIssuer,
      oidcSubject: user.oidcSubject,
      displayName: user.displayName ?? undefined,
      isActive: true,
    };
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    if (activityIds.length > 0) {
      await prisma.realtimeEvent.deleteMany({
        where: {
          OR: activityIds.map((entityId) => ({
            payload: { path: ["entityId"], equals: entityId },
          })),
        },
      });
    }
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [{ activityId: { in: activityIds } }, { actorUserId: { in: userIds } }],
      },
    });
    await prisma.activityParticipant.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activityInvolvedArea.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activityTask.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
    await prisma.architectureDomain.deleteMany({ where: { id: { in: domainIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("computes a THIS_MONTH snapshot for 48 activities within the test budget", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const area = await prisma.area.create({
      data: {
        name: `T28 Mass Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T28 Mass Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    const domain = await prisma.architectureDomain.create({
      data: {
        name: `T28 Mass Domínio ${suffix}`,
        nameNormalized: normalizeCatalogName(`T28 Mass Domínio ${suffix}`),
      },
    });
    domainIds.push(domain.id);

    const owner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t28.mass/${suffix}`,
        oidcSubject: `owner-${suffix}`,
        displayName: `Mass owner ${suffix}`,
        isActive: true,
      },
    });
    userIds.push(owner.id);

    const currentActor = actor;
    const commandDeps = {
      activities: createPrismaActivityRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      domains: createPrismaDomainRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      prisma,
      clock: clockAt(NOW_ISO),
    };

    const inputs: CreateActivityInput[] = Array.from({ length: MASS_ACTIVITY_COUNT }, (_, index) => {
      const status = KANBAN_COLUMN_STATUSES[
        index % KANBAN_COLUMN_STATUSES.length
      ] as CreateActivityInput["status"];
      return {
        title: `T28 Mass ${suffix} #${String(index + 1).padStart(2, "0")}`,
        description: null,
        observations: null,
        type: ActivityType.AD_HOC,
        projectId: null,
        requestingAreaId: area.id,
        domainId: domain.id,
        nature: index % 2 === 0 ? Nature.STRATEGIC : Nature.OPERATIONAL,
        architectureRole: ArchitectureRole.RESPONSIBLE,
        ownerId: owner.id,
        participantIds: [],
        involvedAreaIds: [],
        priority: Priority.MEDIUM,
        effort: null,
        status,
        startDate: "2026-09-01",
        expectedEndDate: null,
        completedDate: status === ActivityStatus.DONE ? "2026-09-08" : null,
      };
    });

    const chunkSize = 8;
    for (let offset = 0; offset < inputs.length; offset += chunkSize) {
      const chunk = inputs.slice(offset, offset + chunkSize);
      const created = await Promise.all(
        chunk.map((input) => createActivity(currentActor, input, commandDeps)),
      );
      activityIds.push(...created.map((row) => row.id));
    }
    expect(activityIds).toHaveLength(MASS_ACTIVITY_COUNT);

    const snapshotDeps = {
      activities: scopeActivities(commandDeps.activities, activityIds),
      audit: createPrismaAuditRepository(prisma),
      users: commandDeps.users,
      areas: commandDeps.areas,
      domains: commandDeps.domains,
      projects: commandDeps.projects,
      clock: commandDeps.clock,
    };

    const started = performance.now();
    const snapshot = await computeManagementSnapshot(
      currentActor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: PeriodPreset.THIS_MONTH,
        },
      },
      snapshotDeps,
    );
    const elapsedMs = performance.now() - started;
    console.info(
      `T28 mass snapshot: ${MASS_ACTIVITY_COUNT} activities in ${Math.round(elapsedMs)}ms (budget ${MASS_SNAPSHOT_BUDGET_MS}ms)`,
    );

    expect(snapshot.populationIds).toHaveLength(MASS_ACTIVITY_COUNT);
    expect(snapshot.indicators["I-01"]).toBe(MASS_ACTIVITY_COUNT);
    expect(elapsedMs).toBeLessThan(MASS_SNAPSHOT_BUDGET_MS);
  });
});
