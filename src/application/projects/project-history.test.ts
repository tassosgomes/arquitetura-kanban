import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { ProjectStatus } from "@/domain/project/project-status";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import { createActivity } from "@/application/activities";
import type { CreateActivityInput } from "@/application/activities";
import { createProject, listProjectHistory } from "@/application/projects";
import type { CreateProjectInput } from "@/application/projects";
import { createValueDelivery } from "@/application/value-deliveries";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaAuditRepository } from "@/infrastructure/db/repositories/prisma-audit-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaValueDeliveryRepository } from "@/infrastructure/db/repositories/prisma-value-delivery-repository";

describe("listProjectHistory (postgres)", () => {
  let prisma: PrismaClient | undefined;
  let actor: LocalUser | undefined;
  const areaIds: string[] = [];
  const domainIds: string[] = [];
  const userIds: string[] = [];
  const projectIds: string[] = [];
  const activityIds: string[] = [];
  const deliveryIds: string[] = [];

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
    if (!prisma) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t24.test/${randomUUID()}`,
        oidcSubject: "t24-actor",
        displayName: "T24 actor",
        email: "t24.actor@example.com",
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

    await prisma.auditEvent.deleteMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          { activityId: { in: activityIds } },
          { actorUserId: { in: userIds } },
        ],
      },
    });
    await prisma.activityTask.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    await prisma.valueDelivery.deleteMany({ where: { id: { in: deliveryIds } } });
    await prisma.projectParticipant.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.architectureDomain.deleteMany({ where: { id: { in: domainIds } } });
    await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  function historyDeps() {
    if (!prisma) {
      throw new Error("postgres unavailable");
    }

    return {
      projects: createPrismaProjectRepository(prisma),
      activities: createPrismaActivityRepository(prisma),
      valueDeliveries: createPrismaValueDeliveryRepository(prisma),
      audit: createPrismaAuditRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      domains: createPrismaDomainRepository(prisma),
    };
  }

  function projectDeps() {
    if (!prisma) {
      throw new Error("postgres unavailable");
    }

    return {
      projects: createPrismaProjectRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      prisma,
    };
  }

  function activityDeps() {
    if (!prisma) {
      throw new Error("postgres unavailable");
    }

    return {
      activities: createPrismaActivityRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      domains: createPrismaDomainRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      prisma,
    };
  }

  function valueDeliveryDeps() {
    if (!prisma) {
      throw new Error("postgres unavailable");
    }

    return {
      valueDeliveries: createPrismaValueDeliveryRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      prisma,
    };
  }

  async function fixtures(suffix: string) {
    if (!prisma) {
      throw new Error("postgres unavailable");
    }

    const area = await prisma.area.create({
      data: {
        name: `T24 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T24 Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    const domain = await prisma.architectureDomain.create({
      data: {
        name: `T24 Domínio ${suffix}`,
        nameNormalized: normalizeCatalogName(`T24 Domínio ${suffix}`),
      },
    });
    domainIds.push(domain.id);

    const owner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t24.test/${randomUUID()}`,
        oidcSubject: `owner-${suffix}`,
        displayName: `Owner ${suffix}`,
        email: `owner.${suffix}@example.com`,
        isActive: true,
      },
    });
    userIds.push(owner.id);

    return { area, domain, owner };
  }

  it("aggregates project, activity and value delivery audit events with source labels", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, domain, owner } = await fixtures(suffix);

    const project = await createProject(
      actor,
      {
        name: `T24 Projeto ${suffix}`,
        description: null,
        responsibleAreaId: area.id,
        externalResponsible: null,
        architectureOwnerId: owner.id,
        participantIds: [],
        architectureRole: ArchitectureRole.RESPONSIBLE,
        nature: Nature.STRATEGIC,
        startDate: null,
        expectedEndDate: null,
        status: ProjectStatus.PLANNED,
      } satisfies CreateProjectInput,
      projectDeps(),
    );
    projectIds.push(project.id);

    const activity = await createActivity(
      actor,
      {
        title: `T24 Atividade ${suffix}`,
        description: null,
        observations: null,
        type: ActivityType.PROJECT,
        projectId: project.id,
        requestingAreaId: area.id,
        domainId: domain.id,
        nature: Nature.STRATEGIC,
        architectureRole: ArchitectureRole.RESPONSIBLE,
        ownerId: owner.id,
        participantIds: [],
        involvedAreaIds: [],
        priority: Priority.MEDIUM,
        effort: null,
        status: ActivityStatus.BACKLOG,
        startDate: null,
        expectedEndDate: null,
        completedDate: null,
      } satisfies CreateActivityInput,
      activityDeps(),
    );
    activityIds.push(activity.id);

    const delivery = await createValueDelivery(
      actor,
      {
        projectId: project.id,
        title: `T24 Entrega ${suffix}`,
        contentMarkdown: "# Resultado",
        referenceDate: "2026-09-01",
      },
      valueDeliveryDeps(),
    );
    deliveryIds.push(delivery.id);

    const page = await listProjectHistory(actor, { projectId: project.id }, historyDeps());

    expect(page.items.length).toBeGreaterThanOrEqual(3);
    expect(page.items.some((item) => item.summary === "Projeto criado")).toBe(true);
    expect(page.items.some((item) => item.summary === "Atividade criada")).toBe(true);
    expect(page.items.some((item) => item.summary.includes("Entrega de valor criada"))).toBe(true);
    expect(page.items.some((item) => item.sourceKind === "project")).toBe(true);
    expect(page.items.some((item) => item.sourceKind === "activity")).toBe(true);
    expect(page.items.some((item) => item.sourceKind === "valueDelivery")).toBe(true);
    expect(page.items.every((item) => item.actorLabel.length > 0)).toBe(true);
    expect(page.items.every((item) => item.occurredAt.length > 0)).toBe(true);
  });
});
