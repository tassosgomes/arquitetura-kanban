import type { Prisma } from "@/generated/prisma/client";
import type { ActivityStatus } from "@/domain/activity/enums";
import type {
  ActivityListFilter,
  ActivityListItem,
  ActivityRecord,
  ActivityTaskRecord,
  ActivityWriteData,
} from "@/application/activities/types";

export type ActivityTx = Prisma.TransactionClient;

export type ActivityStatusWriteData = {
  status: ActivityStatus;
  startDate: string | null;
  completedDate: string | null;
  cancelledDate: string | null;
};

export interface ActivityRepository {
  findById(id: string, tx?: ActivityTx): Promise<ActivityRecord | null>;
  list(filter: ActivityListFilter): Promise<ActivityListItem[]>;
  create(data: ActivityWriteData, actorId: string, tx: ActivityTx): Promise<ActivityRecord>;
  update(id: string, data: ActivityWriteData, actorId: string, tx: ActivityTx): Promise<ActivityRecord>;
  updateStatus(
    id: string,
    data: ActivityStatusWriteData,
    actorId: string,
    tx: ActivityTx,
  ): Promise<ActivityRecord>;
  addTask(activityId: string, description: string, tx: ActivityTx): Promise<ActivityTaskRecord>;
  updateTask(
    id: string,
    data: { description?: string; isDone?: boolean; sortOrder?: number },
    tx: ActivityTx,
  ): Promise<ActivityTaskRecord>;
  deleteTask(activityId: string, taskId: string, tx: ActivityTx): Promise<void>;
  reorderTasks(activityId: string, orderedIds: readonly string[], tx: ActivityTx): Promise<void>;
  touchUpdatedBy(id: string, actorId: string, tx: ActivityTx): Promise<void>;
}
