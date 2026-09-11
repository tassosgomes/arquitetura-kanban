import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PersistedRealtimeEvent, RealtimeEventStore } from "@/infrastructure/realtime/types";

function toPersisted(row: {
  id: bigint;
  type: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
}): PersistedRealtimeEvent {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    createdAt: row.createdAt,
  };
}

export function createPrismaRealtimeEventStore(
  prisma: Pick<PrismaClient, "realtimeEvent">,
): RealtimeEventStore {
  return {
    async findById(id) {
      const row = await prisma.realtimeEvent.findUnique({ where: { id } });
      return row ? toPersisted(row) : null;
    },
    async listAfter(cursorExclusive, retainedSince) {
      const rows = await prisma.realtimeEvent.findMany({
        where: {
          id: { gt: cursorExclusive },
          createdAt: { gte: retainedSince },
        },
        orderBy: { id: "asc" },
      });
      return rows.map(toPersisted);
    },
    async minId() {
      const aggregate = await prisma.realtimeEvent.aggregate({ _min: { id: true } });
      return aggregate._min.id;
    },
    async maxId() {
      const aggregate = await prisma.realtimeEvent.aggregate({ _max: { id: true } });
      return aggregate._max.id;
    },
  };
}
