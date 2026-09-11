import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { instantToCivilDate } from "@/domain/calendar/civil-date";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import {
  changeActivityStatus,
  createActivity,
  listActivityHistory,
  updateActivity,
} from "@/application/activities";
import type { CreateActivityInput } from "@/application/activities";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaAuditRepository } from "@/infrastructure/db/repositories/prisma-audit-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";
import { ACTIVITY_HISTORY_PAGE_SIZE } from "@/application/activities/activity-history-types";

const SP = "America/Sao_Paulo";
const referenceNow = new Date("2026-09-10T18:00:00.000Z");
const referenceToday = instantToCivilDate(referenceNow, SP);
const clock = { now: () => referenceNow };

describe("listActivityHistory (postgres)", () => {
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
        oidcIssuer: `https://t16.test/${randomUUID()}`,
        oidcSubject: "t16-actor",
        displayName: "T16 actor",
        email: "t16.actor@example.com",
        isActive: true,
      },
    });
    userIds.push(user.id);
    actor = {
      id: user.id,
      oidcIssuer: user.oidcIssuer,
      oidcSubject: user.oidcSubject,
      displayName: user.displayName ?? undefined,
      email: user.email ?? undefined,
      isActive: true,
    };
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }

    if (activityIds.length > 0) {
      await prisma.auditEvent.deleteMany({ where: { activityId: { in: activityIds } } });
      await prisma.activityTask.deleteMany({ where: { activityId: { in: activityIds } } });
      await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (areaIds.length > 0) {
      await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
    }
    if (domainIds.length > 0) {
      await prisma.architectureDomain.deleteMany({ where: { id: { in: domainIds } } });
    }
    await prisma.$disconnect();
  });

  function deps() {
    if (!prisma || !actor) {
      throw new Error("postgres unavailable");
    }

    return {
      activities: createPrismaActivityRepository(prisma),
      audit: createPrismaAuditRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      domains: createPrismaDomainRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      prisma,
      clock,
      actor,
    };
  }

  async function fixtures(suffix: string) {
    if (!prisma) {
      throw new Error("postgres unavailable");
    }

    const area = await prisma.area.create({
      data: {
        name: `T16 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T16 Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    const domain = await prisma.architectureDomain.create({
      data: {
        name: `T16 Domínio ${suffix}`,
        nameNormalized: normalizeCatalogName(`T16 Domínio ${suffix}`),
      },
    });
    domainIds.push(domain.id);

    const owner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t16.test/${randomUUID()}`,
        oidcSubject: `owner-${suffix}`,
        displayName: `Owner ${suffix}`,
        email: `owner.${suffix}@example.com`,
        isActive: true,
      },
    });
    userIds.push(owner.id);

    const successor = await prisma.user.create({
      data: {
        oidcIssuer: `https://t16.test/${randomUUID()}`,
        oidcSubject: `successor-${suffix}`,
        displayName: `Successor ${suffix}`,
        email: `successor.${suffix}@example.com`,
        isActive: true,
      },
    });
    userIds.push(successor.id);

    return { area, domain, owner, successor };
  }

  function adHocInput(
    areaId: string,
    domainId: string,
    ownerId: string,
    title: string,
    overrides: Partial<CreateActivityInput> = {},
  ): CreateActivityInput {
    return {
      title,
      description: null,
      observations: null,
      type: ActivityType.AD_HOC,
      projectId: null,
      requestingAreaId: areaId,
      domainId,
      nature: Nature.STRATEGIC,
      architectureRole: ArchitectureRole.RESPONSIBLE,
      ownerId,
      participantIds: [],
      involvedAreaIds: [],
      priority: Priority.MEDIUM,
      effort: null,
      status: ActivityStatus.BACKLOG,
      startDate: null,
      expectedEndDate: null,
      completedDate: null,
      ...overrides,
    };
  }

  it("returns readable events with actor, date and ordered sequence", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner, successor } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T16 histórico ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    const inProgress = await changeActivityStatus(
      actor,
      { id: created.id, version: created.version, status: ActivityStatus.IN_PROGRESS },
      deps(),
    );
    const reassigned = await updateActivity(
      actor,
      {
        id: inProgress.id,
        version: inProgress.version,
        type: inProgress.type,
        projectId: null,
        title: inProgress.title,
        description: inProgress.description,
        requestingAreaId: area.id,
        involvedAreaIds: [],
        domainId: domain.id,
        nature: Nature.STRATEGIC,
        architectureRole: ArchitectureRole.RESPONSIBLE,
        ownerId: successor.id,
        participantIds: [],
        priority: Priority.HIGH,
        effort: null,
        status: ActivityStatus.IN_PROGRESS,
        startDate: referenceToday,
        expectedEndDate: null,
        completedDate: null,
        observations: null,
      },
      deps(),
    );
    const done = await changeActivityStatus(
      actor,
      { id: reassigned.id, version: reassigned.version, status: ActivityStatus.DONE },
      deps(),
    );
    const reopened = await changeActivityStatus(
      actor,
      { id: done.id, version: done.version },
      deps(),
    );
    expect(reopened.status).toBe(ActivityStatus.IN_PROGRESS);

    const page = await listActivityHistory(actor, { activityId: created.id }, deps());

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items[0]?.summary).toBe("Atividade criada");
    expect(page.items.some((item) => item.summary.includes("Status: Backlog → Em andamento"))).toBe(
      true,
    );
    expect(
      page.items.some(
        (item) =>
          item.summary.includes("Responsável alterado para Successor") ||
          item.summary.includes("Responsável:") && item.summary.includes("Successor"),
      ),
    ).toBe(true);
    expect(page.items.some((item) => item.summary.includes("Prioridade: Média → Alta"))).toBe(true);
    expect(page.items.some((item) => item.summary.includes("Status: Concluído → Em andamento"))).toBe(
      true,
    );

    for (const item of page.items) {
      expect(item.actorLabel).toContain("T16 actor");
      expect(item.occurredAt.length).toBeGreaterThan(0);
      expect(item.summary).not.toContain("{");
      expect(item.summary).not.toContain("BACKLOG");
    }

    const sequences = page.items.map((item) => BigInt(item.sequence));
    for (let index = 1; index < sequences.length; index += 1) {
      expect(sequences[index]).toBeGreaterThan(sequences[index - 1]!);
    }
  });

  it("paginates older events by sequence cursor", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);
    const created = await createActivity(
      actor,
      adHocInput(area.id, domain.id, owner.id, `T16 paginação ${suffix}`),
      deps(),
    );
    activityIds.push(created.id);

    let current = created;
    for (let step = 0; step < ACTIVITY_HISTORY_PAGE_SIZE + 3; step += 1) {
      current = await changeActivityStatus(
        actor,
        {
          id: current.id,
          version: current.version,
          status: step % 2 === 0 ? ActivityStatus.TODO : ActivityStatus.BACKLOG,
        },
        deps(),
      );
    }

    const firstPage = await listActivityHistory(
      actor,
      { activityId: created.id, limit: ACTIVITY_HISTORY_PAGE_SIZE },
      deps(),
    );
    expect(firstPage.items).toHaveLength(ACTIVITY_HISTORY_PAGE_SIZE);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.oldestSequence).toBe(firstPage.items[0]?.sequence ?? null);

    const secondPage = await listActivityHistory(
      actor,
      {
        activityId: created.id,
        limit: ACTIVITY_HISTORY_PAGE_SIZE,
        beforeSequence: firstPage.oldestSequence,
      },
      deps(),
    );
    expect(secondPage.items.length).toBeGreaterThan(0);
    expect(
      BigInt(secondPage.items[secondPage.items.length - 1]!.sequence),
    ).toBeLessThan(BigInt(firstPage.oldestSequence!));
  });
});
