import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { formatChecklistProgress } from "@/domain/activity/checklist";
import { ProjectStatus } from "@/domain/project/project-status";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import type { Clock } from "@/application/ports/clock";
import {
  addActivityTask,
  buildKanbanBoard,
  changeActivityStatus,
  createActivity,
  getActivity,
  listActivities,
  toggleActivityTask,
  toActivityListFilter,
  DEFAULT_KANBAN_FILTER_VALUES,
} from "@/application/activities";
import type { CreateActivityInput } from "@/application/activities";
import { createProject, getProject } from "@/application/projects";
import type { CreateProjectInput } from "@/application/projects";
import { createValueDelivery, listValueDeliveries } from "@/application/value-deliveries";
import { CSV_UTF8_BOM } from "@/infrastructure/csv/encode";
import { handleReportsCsvGet } from "@/infrastructure/csv/handle-reports-csv";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaAuditRepository } from "@/infrastructure/db/repositories/prisma-audit-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";
import { createPrismaValueDeliveryRepository } from "@/infrastructure/db/repositories/prisma-value-delivery-repository";

/**
 * Application-layer stand-in for T28's main flow without Logto:
 * (provisioned user) → project → activity → checklist → Kanban → delivery → report/CSV.
 * Login SSO is not exercised here; see e2e/authenticated-flow.spec.ts and
 * docs/guides/nfr-validation.md.
 */
const NOW_ISO = "2026-09-10T15:00:00-03:00";
/** Report after mutations so audit events are strictly before fechamentoExclusivo. */
const REPORT_NOW_ISO = "2026-09-10T15:05:00-03:00";

function clockAt(iso: string): Clock {
  return { now: () => new Date(iso) };
}

describe("MVP integrated flow (postgres, T28)", () => {
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
        oidcIssuer: `https://t28.flow/${randomUUID()}`,
        oidcSubject: "t28-flow-actor",
        displayName: "T28 flow actor",
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
    const entityIds = [...activityIds, ...projectIds, ...deliveryIds];
    if (entityIds.length > 0) {
      await prisma.realtimeEvent.deleteMany({
        where: {
          OR: entityIds.map((entityId) => ({
            payload: { path: ["entityId"], equals: entityId },
          })),
        },
      });
    }
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [
          { activityId: { in: activityIds } },
          { projectId: { in: projectIds } },
          { actorUserId: { in: userIds } },
        ],
      },
    });
    await prisma.valueDelivery.deleteMany({ where: { id: { in: deliveryIds } } });
    await prisma.activityParticipant.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activityInvolvedArea.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activityTask.deleteMany({ where: { activityId: { in: activityIds } } });
    await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    await prisma.projectParticipant.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
    await prisma.architectureDomain.deleteMany({ where: { id: { in: domainIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  function deps() {
    if (!prisma || !actor) {
      throw new Error("postgres unavailable");
    }
    const clock = clockAt(NOW_ISO);
    return {
      activities: createPrismaActivityRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      domains: createPrismaDomainRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      audit: createPrismaAuditRepository(prisma),
      valueDeliveries: createPrismaValueDeliveryRepository(prisma),
      prisma,
      actor,
      clock,
    };
  }

  it("runs project → activity → checklist → Kanban → delivery → CSV", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const area = await prisma.area.create({
      data: {
        name: `T28 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T28 Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    const domain = await prisma.architectureDomain.create({
      data: {
        name: `T28 Domínio ${suffix}`,
        nameNormalized: normalizeCatalogName(`T28 Domínio ${suffix}`),
      },
    });
    domainIds.push(domain.id);

    const owner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t28.flow/${suffix}`,
        oidcSubject: `owner-${suffix}`,
        displayName: `Owner ${suffix}`,
        isActive: true,
      },
    });
    userIds.push(owner.id);

    const d = deps();
    const projectInput: CreateProjectInput = {
      name: `T28 Projeto ${suffix}`,
      description: "Projeto do fluxo integrado",
      responsibleAreaId: area.id,
      externalResponsible: null,
      architectureOwnerId: owner.id,
      participantIds: [],
      architectureRole: ArchitectureRole.RESPONSIBLE,
      nature: Nature.STRATEGIC,
      startDate: "2026-09-01",
      expectedEndDate: "2026-09-30",
      status: ProjectStatus.IN_PROGRESS,
    };
    const project = await createProject(d.actor, projectInput, d);
    projectIds.push(project.id);

    const loadedProject = await getProject(d.actor, project.id, d.projects);
    expect(loadedProject?.name).toBe(projectInput.name);

    const activityInput: CreateActivityInput = {
      title: `T28 Atividade ${suffix}`,
      description: "Atividade do fluxo integrado",
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
      priority: Priority.HIGH,
      effort: null,
      status: ActivityStatus.BACKLOG,
      startDate: null,
      expectedEndDate: "2026-09-30",
      completedDate: null,
    };
    let activity = await createActivity(d.actor, activityInput, d);
    activityIds.push(activity.id);
    expect(activity.project?.id).toBe(project.id);
    expect(activity.status).toBe(ActivityStatus.BACKLOG);

    const firstTask = await addActivityTask(
      d.actor,
      { activityId: activity.id, version: activity.version, description: "Tarefa um" },
      d,
    );
    const secondTask = await addActivityTask(
      d.actor,
      { activityId: firstTask.id, version: firstTask.version, description: "Tarefa dois" },
      d,
    );
    expect(secondTask.status).toBe(ActivityStatus.BACKLOG);
    expect(formatChecklistProgress(secondTask.tasks)).toBe("0/2");

    const toggled = await toggleActivityTask(
      d.actor,
      {
        activityId: secondTask.id,
        taskId: secondTask.tasks[0]!.id,
        version: secondTask.version,
        isDone: true,
      },
      d,
    );
    expect(formatChecklistProgress(toggled.tasks)).toBe("1/2");
    expect(toggled.status).toBe(ActivityStatus.BACKLOG);

    activity = await changeActivityStatus(
      d.actor,
      { id: toggled.id, version: toggled.version, status: ActivityStatus.TODO },
      d,
    );
    activity = await changeActivityStatus(
      d.actor,
      { id: activity.id, version: activity.version, status: ActivityStatus.IN_PROGRESS },
      d,
    );
    expect(activity.status).toBe(ActivityStatus.IN_PROGRESS);
    expect(activity.startDate).toBe("2026-09-10");

    const listed = await listActivities(
      d.actor,
      toActivityListFilter(DEFAULT_KANBAN_FILTER_VALUES, d.actor.id),
      d.activities,
      d.clock,
    );
    const onBoard = listed.filter((item) => item.id === activity.id);
    const columns = buildKanbanBoard(onBoard);
    const inProgress = columns.find((column) => column.status === ActivityStatus.IN_PROGRESS);
    expect(inProgress?.activities).toHaveLength(1);
    expect(inProgress?.activities[0]?.checklistDoneCount).toBe(1);
    expect(inProgress?.activities[0]?.checklistTotalCount).toBe(2);
    expect(inProgress?.activities[0]?.project?.id).toBe(project.id);

    const delivery = await createValueDelivery(
      d.actor,
      {
        projectId: project.id,
        title: `T28 Entrega ${suffix}`,
        contentMarkdown: "## Valor\n\nEntrega do fluxo integrado.",
        referenceDate: "2026-09-10",
      },
      d,
    );
    deliveryIds.push(delivery.id);
    const deliveries = await listValueDeliveries(d.actor, project.id, d.valueDeliveries);
    expect(deliveries.some((item) => item.id === delivery.id)).toBe(true);

    activity = await changeActivityStatus(
      d.actor,
      { id: activity.id, version: activity.version, status: ActivityStatus.DONE },
      d,
    );
    expect(activity.status).toBe(ActivityStatus.DONE);
    expect(activity.completedDate).toBe("2026-09-10");

    const detail = await getActivity(d.actor, activity.id, d.activities);
    expect(detail?.status).toBe(ActivityStatus.DONE);

    const csvResponse = await handleReportsCsvGet(
      new Request("http://localhost/api/reports/csv?period=THIS_MONTH"),
      {
        authenticate: async () => d.actor,
        activities: {
          ...d.activities,
          list: async (filter) => {
            const rows = await d.activities.list(filter);
            return rows.filter((row) => row.id === activity.id);
          },
        },
        audit: d.audit,
        users: d.users,
        areas: d.areas,
        domains: d.domains,
        projects: d.projects,
        clock: clockAt(REPORT_NOW_ISO),
      },
    );

    expect(csvResponse.status).toBe(200);
    const bytes = new Uint8Array(await csvResponse.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    expect(text.startsWith(CSV_UTF8_BOM)).toBe(true);
    expect(text).toContain(activity.id);
    expect(text).toContain(`T28 Atividade ${suffix}`);
    expect(text).toContain(`T28 Projeto ${suffix}`);
    expect(text).toContain("Concluído");
  });
});
