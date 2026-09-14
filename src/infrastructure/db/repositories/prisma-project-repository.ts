import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import type { ProjectStatus } from "@/domain/project/project-status";
import type { ProjectRepository, ProjectTx } from "@/application/ports/project-repository";
import type {
  ProjectListFilter,
  ProjectListItem,
  ProjectRecord,
  ProjectUserRef,
  ProjectWriteData,
} from "@/application/projects/types";
import { fromPrismaDate, toPrismaDate } from "@/infrastructure/calendar";

const projectInclude = {
  responsibleArea: { select: { id: true, name: true, isActive: true } },
  participants: {
    include: {
      user: { select: { id: true, displayName: true, email: true, isActive: true } },
    },
  },
  createdBy: { select: { id: true, displayName: true } },
  updatedBy: { select: { id: true, displayName: true } },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

function client(prisma: PrismaClient, tx?: ProjectTx) {
  return tx ?? prisma;
}

function mapUser(row: {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
}): ProjectUserRef {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    isActive: row.isActive,
  };
}

function mapParticipants(row: ProjectRow): ProjectUserRef[] {
  return [...row.participants]
    .map((participant) => mapUser(participant.user))
    .sort((a, b) => (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? "", "pt-BR"));
}

function mapProjectRecord(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    externalResponsible: row.externalResponsible,
    status: row.status as ProjectStatus,
    nature: row.nature as Nature,
    architectureRole: row.architectureRole as ArchitectureRole,
    startDate: fromPrismaDate(row.startDate),
    expectedEndDate: fromPrismaDate(row.expectedEndDate),
    version: row.version,
    responsibleArea: {
      id: row.responsibleArea.id,
      name: row.responsibleArea.name,
      isActive: row.responsibleArea.isActive,
    },
    participants: mapParticipants(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: { id: row.createdBy.id, displayName: row.createdBy.displayName },
    updatedBy: { id: row.updatedBy.id, displayName: row.updatedBy.displayName },
  };
}

function mapListItem(row: {
  id: string;
  name: string;
  status: ProjectRow["status"];
  updatedAt: Date;
  responsibleArea: { id: string; name: string; isActive: boolean };
}): ProjectListItem {
  return {
    id: row.id,
    name: row.name,
    status: row.status as ProjectStatus,
    updatedAt: row.updatedAt,
    responsibleArea: row.responsibleArea,
  };
}

function listWhere(filter: ProjectListFilter): Prisma.ProjectWhereInput {
  switch (filter) {
    case "active":
      return { status: { not: "CANCELLED" } };
    case "cancelled":
      return { status: "CANCELLED" };
    case "all":
      return {};
  }
}

function scalarWrite(data: ProjectWriteData, actorId: string) {
  return {
    name: data.name,
    nameNormalized: data.nameNormalized,
    description: data.description,
    responsibleAreaId: data.responsibleAreaId,
    externalResponsible: data.externalResponsible,
    nature: data.nature,
    architectureRole: data.architectureRole,
    startDate: toPrismaDate(data.startDate),
    expectedEndDate: toPrismaDate(data.expectedEndDate),
    status: data.status,
    updatedById: actorId,
  };
}

export function createPrismaProjectRepository(prisma: PrismaClient): ProjectRepository {
  return {
    findById(id, tx) {
      return client(prisma, tx)
        .project.findUnique({ where: { id }, include: projectInclude })
        .then((row) => (row ? mapProjectRecord(row) : null));
    },

    findActiveByNameNormalized(nameNormalized, tx) {
      return client(prisma, tx)
        .project.findFirst({
          where: { nameNormalized, status: { not: "CANCELLED" } },
          select: { id: true, name: true },
        })
        .then((row) => row ?? null);
    },

    list(filter) {
      return prisma.project
        .findMany({
          where: listWhere(filter),
          select: {
            id: true,
            name: true,
            status: true,
            updatedAt: true,
            responsibleArea: { select: { id: true, name: true, isActive: true } },
          },
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        })
        .then((rows) => rows.map(mapListItem));
    },

    create(data, actorId, tx) {
      return tx.project
        .create({
          data: {
            ...scalarWrite(data, actorId),
            createdById: actorId,
            participants: {
              create: data.participantIds.map((userId) => ({ userId })),
            },
          },
          include: projectInclude,
        })
        .then(mapProjectRecord);
    },

    async update(id, data, actorId, tx) {
      return tx.project
        .update({
          where: { id },
          data: {
            ...scalarWrite(data, actorId),
            participants: {
              deleteMany: {},
              create: data.participantIds.map((userId) => ({ userId })),
            },
          },
          include: projectInclude,
        })
        .then(mapProjectRecord);
    },

    cancel(id, actorId, tx) {
      return tx.project
        .update({
          where: { id },
          data: { status: "CANCELLED", updatedById: actorId },
          include: projectInclude,
        })
        .then(mapProjectRecord);
    },

    listActiveInheritanceSnapshots() {
      return prisma.project
        .findMany({
          where: { status: { not: "CANCELLED" } },
          select: {
            id: true,
            name: true,
            nature: true,
            architectureRole: true,
            responsibleAreaId: true,
            participants: { select: { userId: true } },
          },
          orderBy: { name: "asc" },
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            nature: row.nature as Nature,
            architectureRole: row.architectureRole as ArchitectureRole,
            responsibleAreaId: row.responsibleAreaId,
            participantIds: row.participants.map((participant) => participant.userId),
          })),
        );
    },
  };
}
