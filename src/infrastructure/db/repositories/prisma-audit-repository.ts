import type { PrismaClient } from "@/generated/prisma/client";
import type { AuditChanges } from "@/application/audit/types";
import type { AuditEventRecord, AuditRepository } from "@/application/ports/audit-repository";

function mapRow(row: {
  id: string;
  sequence: bigint;
  occurredAt: Date;
  actorUserId: string;
  entityKind: AuditEventRecord["entityKind"];
  entityId: string;
  action: string;
  activityId: string | null;
  changes: unknown;
}): AuditEventRecord {
  return {
    id: row.id,
    sequence: row.sequence,
    occurredAt: row.occurredAt,
    actorUserId: row.actorUserId,
    entityKind: row.entityKind,
    entityId: row.entityId,
    action: row.action,
    activityId: row.activityId,
    changes: row.changes as AuditChanges,
  };
}

export function createPrismaAuditRepository(prisma: PrismaClient): AuditRepository {
  return {
    async listForActivity({ activityId, limit, beforeSequence }) {
      const where = {
        activityId,
        ...(beforeSequence != null ? { sequence: { lt: beforeSequence } } : {}),
      };

      const rows = await prisma.auditEvent.findMany({
        where,
        orderBy: [{ sequence: "desc" }],
        take: limit + 1,
        select: {
          id: true,
          sequence: true,
          occurredAt: true,
          actorUserId: true,
          entityKind: true,
          entityId: true,
          action: true,
          activityId: true,
          changes: true,
        },
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      return {
        events: page.reverse().map(mapRow),
        hasMore,
      };
    },
  };
}
