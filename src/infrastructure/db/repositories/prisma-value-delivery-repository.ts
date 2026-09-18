import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type {
  ValueDeliveryTx,
  ValueDeliveryRepository,
} from "@/application/ports/value-delivery-repository";
import type {
  ValueDeliveryAuthorRef,
  ValueDeliveryCreateData,
  ValueDeliveryListItem,
  ValueDeliveryRecord,
  ValueDeliveryWriteData,
} from "@/application/value-deliveries/types";
import { utcMidnightToCivilDate } from "@/infrastructure/calendar";
import { civilDateToUtcMidnight } from "@/domain/calendar/civil-date";

const deliveryInclude = {
  author: { select: { id: true, displayName: true, email: true, isActive: true } },
} satisfies Prisma.ValueDeliveryInclude;

type DeliveryRow = Prisma.ValueDeliveryGetPayload<{ include: typeof deliveryInclude }>;

function client(prisma: PrismaClient, tx?: ValueDeliveryTx) {
  return tx ?? prisma;
}

function mapAuthor(row: DeliveryRow["author"]): ValueDeliveryAuthorRef {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    isActive: row.isActive,
  };
}

function mapRecord(row: DeliveryRow): ValueDeliveryRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    contentMarkdown: row.contentMarkdown,
    referenceDate: utcMidnightToCivilDate(row.referenceDate),
    version: row.version,
    author: mapAuthor(row.author),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapListItem(row: DeliveryRow): ValueDeliveryListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    referenceDate: utcMidnightToCivilDate(row.referenceDate),
    author: mapAuthor(row.author),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createPrismaValueDeliveryRepository(
  prisma: PrismaClient,
): ValueDeliveryRepository {
  return {
    findById(id, tx) {
      return client(prisma, tx)
        .valueDelivery.findUnique({ where: { id }, include: deliveryInclude })
        .then((row) => (row ? mapRecord(row) : null));
    },

    listByProjectId(projectId) {
      return prisma.valueDelivery
        .findMany({
          where: { projectId },
          include: deliveryInclude,
          orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
        })
        .then((rows) => rows.map(mapListItem));
    },

    listByProjectIds(projectIds) {
      if (projectIds.length === 0) {
        return Promise.resolve([]);
      }
      return prisma.valueDelivery
        .findMany({
          where: { projectId: { in: [...projectIds] } },
          include: deliveryInclude,
          orderBy: [{ referenceDate: "desc" }, { createdAt: "desc" }],
        })
        .then((rows) => rows.map(mapListItem));
    },

    create(data: ValueDeliveryCreateData, authorId, tx) {
      return client(prisma, tx)
        .valueDelivery.create({
          data: {
            projectId: data.projectId,
            title: data.title,
            contentMarkdown: data.contentMarkdown,
            referenceDate: civilDateToUtcMidnight(data.referenceDate),
            authorId,
          },
          include: deliveryInclude,
        })
        .then(mapRecord);
    },

    update(id, data: ValueDeliveryWriteData, tx) {
      return client(prisma, tx)
        .valueDelivery.update({
          where: { id },
          data: {
            title: data.title,
            contentMarkdown: data.contentMarkdown,
            referenceDate: civilDateToUtcMidnight(data.referenceDate),
          },
          include: deliveryInclude,
        })
        .then(mapRecord);
    },
  };
}
