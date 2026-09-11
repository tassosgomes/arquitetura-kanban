import type { Prisma } from "@/generated/prisma/client";
import type {
  ActivityListFilter,
  ActivityListItem,
  ActivityRecord,
  ActivityWriteData,
} from "@/application/activities/types";

export type ActivityTx = Prisma.TransactionClient;

export interface ActivityRepository {
  findById(id: string, tx?: ActivityTx): Promise<ActivityRecord | null>;
  list(filter: ActivityListFilter): Promise<ActivityListItem[]>;
  create(data: ActivityWriteData, actorId: string, tx: ActivityTx): Promise<ActivityRecord>;
  update(id: string, data: ActivityWriteData, actorId: string, tx: ActivityTx): Promise<ActivityRecord>;
}
