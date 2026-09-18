import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { checklistProgress } from "@/domain/activity/checklist";
import type { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import type { ActivityRepository, ActivityTx } from "@/application/ports/activity-repository";
import type {
  ActivityAreaRef,
  ActivityListFilter,
  ActivityListItem,
  ActivityRecord,
  ActivityTaskRecord,
  ActivityUserRef,
  ActivityWriteData,
} from "@/application/activities/types";
import { EFFORT_FILTER_UNSET } from "@/application/activities/types";
import { fromPrismaDate, toPrismaDate } from "@/infrastructure/calendar";

const activityInclude = {
  project: { select: { id: true, name: true, status: true } },
  requestingArea: { select: { id: true, name: true, isActive: true } },
  domain: { select: { id: true, name: true, isActive: true } },
  owner: { select: { id: true, displayName: true, email: true, isActive: true } },
  participants: {
    include: {
      user: { select: { id: true, displayName: true, email: true, isActive: true } },
    },
  },
  involvedAreas: {
    include: {
      area: { select: { id: true, name: true, isActive: true } },
    },
  },
  createdBy: { select: { id: true, displayName: true } },
  updatedBy: { select: { id: true, displayName: true } },
  tasks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.ActivityInclude;

type ActivityRow = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

function client(prisma: PrismaClient, tx?: ActivityTx) {
  return tx ?? prisma;
}

function mapUser(row: {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
}): ActivityUserRef {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    isActive: row.isActive,
  };
}

function mapArea(row: { id: string; name: string; isActive: boolean }): ActivityAreaRef {
  return { id: row.id, name: row.name, isActive: row.isActive };
}

function mapParticipants(row: ActivityRow): ActivityUserRef[] {
  return [...row.participants]
    .map((participant) => mapUser(participant.user))
    .sort((a, b) =>
      (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? "", "pt-BR"),
    );
}

function mapInvolvedAreas(row: ActivityRow): ActivityAreaRef[] {
  return [...row.involvedAreas]
    .map((link) => mapArea(link.area))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function mapTask(row: {
  id: string;
  description: string;
  isDone: boolean;
  sortOrder: number;
}): ActivityTaskRecord {
  return {
    id: row.id,
    description: row.description,
    isDone: row.isDone,
    sortOrder: row.sortOrder,
  };
}

async function compactTaskOrder(tx: ActivityTx, activityId: string): Promise<void> {
  const tasks = await tx.activityTask.findMany({
    where: { activityId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });
  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    if (task && task.sortOrder !== index) {
      await tx.activityTask.update({
        where: { id: task.id },
        data: { sortOrder: index },
      });
    }
  }
}

function mapActivityRecord(row: ActivityRow): ActivityRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    observations: row.observations,
    type: row.type as ActivityType,
    status: row.status as ActivityStatus,
    nature: row.nature as Nature,
    architectureRole: row.architectureRole as ArchitectureRole,
    priority: row.priority as Priority,
    effort: (row.effort as Effort | null) ?? null,
    startDate: fromPrismaDate(row.startDate),
    expectedEndDate: fromPrismaDate(row.expectedEndDate),
    completedDate: fromPrismaDate(row.completedDate),
    cancelledDate: fromPrismaDate(row.cancelledDate),
    version: row.version,
    project: row.project
      ? { id: row.project.id, name: row.project.name, status: row.project.status }
      : null,
    requestingArea: mapArea(row.requestingArea),
    domain: {
      id: row.domain.id,
      name: row.domain.name,
      isActive: row.domain.isActive,
    },
    owner: mapUser(row.owner),
    participants: mapParticipants(row),
    involvedAreas: mapInvolvedAreas(row),
    tasks: row.tasks.map(mapTask),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: { id: row.createdBy.id, displayName: row.createdBy.displayName },
    updatedBy: { id: row.updatedBy.id, displayName: row.updatedBy.displayName },
  };
}

function mapListItem(row: {
  id: string;
  title: string;
  description: string | null;
  type: ActivityRow["type"];
  status: ActivityRow["status"];
  priority: ActivityRow["priority"];
  effort: ActivityRow["effort"];
  architectureRole: ActivityRow["architectureRole"];
  startDate: Date | null;
  expectedEndDate: Date | null;
  completedDate: Date | null;
  cancelledDate: Date | null;
  updatedAt: Date;
  version: number;
  project: { id: string; name: string; status: string } | null;
  requestingArea: { id: string; name: string; isActive: boolean };
  owner: {
    id: string;
    displayName: string | null;
    email: string | null;
    isActive: boolean;
  };
  tasks: { isDone: boolean }[];
}): ActivityListItem {
  const checklist = checklistProgress(row.tasks);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as ActivityType,
    status: row.status as ActivityStatus,
    priority: row.priority as Priority,
    effort: (row.effort as Effort | null) ?? null,
    architectureRole: row.architectureRole as ArchitectureRole,
    startDate: fromPrismaDate(row.startDate),
    expectedEndDate: fromPrismaDate(row.expectedEndDate),
    completedDate: fromPrismaDate(row.completedDate),
    cancelledDate: fromPrismaDate(row.cancelledDate),
    version: row.version,
    checklistDoneCount: checklist.done,
    checklistTotalCount: checklist.total,
    updatedAt: row.updatedAt,
    project: row.project,
    requestingArea: mapArea(row.requestingArea),
    owner: mapUser(row.owner),
  };
}

function listWhere(filter: ActivityListFilter): Prisma.ActivityWhereInput {
  const and: Prisma.ActivityWhereInput[] = [];

  if (filter.projectId) {
    and.push({ projectId: filter.projectId });
  }

  if (filter.status) {
    and.push({ status: filter.status });
  } else if (!filter.includeCancelled) {
    and.push({ status: { not: "CANCELLED" } });
  }

  if (filter.areaId) {
    and.push({
      OR: [
        { requestingAreaId: filter.areaId },
        { involvedAreas: { some: { areaId: filter.areaId } } },
      ],
    });
  }

  if (filter.ownerId) {
    and.push({ ownerId: filter.ownerId });
  }

  if (filter.participantId) {
    and.push({ participants: { some: { userId: filter.participantId } } });
  }

  if (filter.involvedUserId) {
    and.push({
      OR: [
        { ownerId: filter.involvedUserId },
        { participants: { some: { userId: filter.involvedUserId } } },
      ],
    });
  }

  if (filter.domainId) {
    and.push({ domainId: filter.domainId });
  }

  if (filter.nature) {
    and.push({ nature: filter.nature });
  }

  if (filter.priority) {
    and.push({ priority: filter.priority });
  }

  if (filter.architectureRole) {
    and.push({ architectureRole: filter.architectureRole });
  }

  if (filter.effort === EFFORT_FILTER_UNSET) {
    and.push({ effort: null });
  } else if (filter.effort) {
    and.push({ effort: filter.effort });
  }

  return and.length > 0 ? { AND: and } : {};
}

function scalarWrite(data: ActivityWriteData, actorId: string) {
  return {
    title: data.title,
    description: data.description,
    observations: data.observations,
    type: data.type,
    projectId: data.projectId,
    requestingAreaId: data.requestingAreaId,
    domainId: data.domainId,
    nature: data.nature,
    architectureRole: data.architectureRole,
    ownerId: data.ownerId,
    priority: data.priority,
    effort: data.effort,
    status: data.status,
    startDate: toPrismaDate(data.startDate),
    expectedEndDate: toPrismaDate(data.expectedEndDate),
    completedDate: toPrismaDate(data.completedDate),
    updatedById: actorId,
  };
}

export function createPrismaActivityRepository(prisma: PrismaClient): ActivityRepository {
  return {
    findById(id, tx) {
      return client(prisma, tx)
        .activity.findUnique({ where: { id }, include: activityInclude })
        .then((row) => (row ? mapActivityRecord(row) : null));
    },

    list(filter) {
      return prisma.activity
        .findMany({
          where: listWhere(filter),
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            status: true,
            priority: true,
            effort: true,
            architectureRole: true,
            startDate: true,
            expectedEndDate: true,
            completedDate: true,
            cancelledDate: true,
            updatedAt: true,
            version: true,
            project: { select: { id: true, name: true, status: true } },
            requestingArea: { select: { id: true, name: true, isActive: true } },
            owner: {
              select: { id: true, displayName: true, email: true, isActive: true },
            },
            tasks: { select: { isDone: true } },
          },
          orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        })
        .then((rows) => rows.map(mapListItem));
    },

    create(data, actorId, tx) {
      return tx.activity
        .create({
          data: {
            ...scalarWrite(data, actorId),
            createdById: actorId,
            participants: {
              create: data.participantIds.map((userId) => ({ userId })),
            },
            involvedAreas: {
              create: data.involvedAreaIds.map((areaId) => ({ areaId })),
            },
          },
          include: activityInclude,
        })
        .then(mapActivityRecord);
    },

    update(id, data, actorId, tx) {
      return tx.activity
        .update({
          where: { id },
          data: {
            ...scalarWrite(data, actorId),
            participants: {
              deleteMany: {},
              create: data.participantIds.map((userId) => ({ userId })),
            },
            involvedAreas: {
              deleteMany: {},
              create: data.involvedAreaIds.map((areaId) => ({ areaId })),
            },
          },
          include: activityInclude,
        })
        .then(mapActivityRecord);
    },

    updateStatus(id, data, actorId, tx) {
      return tx.activity
        .update({
          where: { id },
          data: {
            status: data.status,
            startDate: toPrismaDate(data.startDate),
            completedDate: toPrismaDate(data.completedDate),
            cancelledDate: toPrismaDate(data.cancelledDate),
            updatedById: actorId,
          },
          include: activityInclude,
        })
        .then(mapActivityRecord);
    },

    async addTask(activityId, description, tx) {
      const aggregate = await tx.activityTask.aggregate({
        where: { activityId },
        _max: { sortOrder: true },
      });
      const sortOrder = (aggregate._max.sortOrder ?? -1) + 1;
      const created = await tx.activityTask.create({
        data: { activityId, description, isDone: false, sortOrder },
      });
      return mapTask(created);
    },

    updateTask(id, data, tx) {
      return tx.activityTask.update({ where: { id }, data }).then(mapTask);
    },

    async deleteTask(activityId, taskId, tx) {
      await tx.activityTask.delete({ where: { id: taskId } });
      await compactTaskOrder(tx, activityId);
    },

    async reorderTasks(activityId, orderedIds, tx) {
      for (let index = 0; index < orderedIds.length; index += 1) {
        const id = orderedIds[index];
        if (!id) {
          continue;
        }
        await tx.activityTask.update({
          where: { id },
          data: { sortOrder: index },
        });
      }
    },

    async touchUpdatedBy(id, actorId, tx) {
      await tx.activity.update({
        where: { id },
        data: { updatedById: actorId },
      });
    },
  };
}
