import type { Prisma } from "@/generated/prisma/client";
import type { AuditEventWrite } from "@/application/audit/types";
import { deriveRealtimeEvents } from "@/application/realtime/derive-event";

export async function insertRealtimeEvents(
  tx: Prisma.TransactionClient,
  writes: readonly AuditEventWrite[],
): Promise<bigint[]> {
  const drafts = deriveRealtimeEvents(writes);
  const ids: bigint[] = [];

  for (const draft of drafts) {
    const row = await tx.realtimeEvent.create({
      data: {
        type: draft.type,
        payload: draft.payload as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    ids.push(row.id);
  }

  return ids;
}
