import type { LocalUser } from "@/domain/identity/local-user";
import { canEditActivity } from "@/domain/activity/enums";
import { isTaskOrderPermutation } from "@/domain/activity/checklist";
import { ConflictError, InvariantError, NotFoundError, ValidationError } from "@/domain/errors";
import {
  ACTIVITY_TASK_AUDIT_FIELDS,
  activityTaskAuditSnapshot,
  AuditAction,
  AuditEntityKind,
  buildCreatedChanges,
  buildUpdatedChanges,
} from "@/application/audit";
import type {
  AddActivityTaskInput,
  RemoveActivityTaskInput,
  ReorderActivityTasksInput,
  ToggleActivityTaskInput,
  UpdateActivityTaskInput,
} from "@/application/activities/schemas";
import type {
  ActivityChecklistResult,
  ActivityRecord,
  ActivityTaskRecord,
} from "@/application/activities/types";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AuditedPrismaClient } from "@/infrastructure/db/audited-transaction";
import type { Prisma } from "@/generated/prisma/client";
import { runActivityAudited } from "@/application/activities/run-activity-audited";

export type ActivityChecklistDeps = {
  activities: ActivityRepository;
  prisma: AuditedPrismaClient;
};

const STALE_VERSION_MESSAGE =
  "Esta atividade foi atualizada por outra pessoa. Recarregue os dados.";

function toChecklistResult(activity: ActivityRecord): ActivityChecklistResult {
  return {
    id: activity.id,
    version: activity.version,
    status: activity.status,
    projectId: activity.project?.id ?? null,
    tasks: activity.tasks,
  };
}

function staleVersion(): never {
  throw new ConflictError(STALE_VERSION_MESSAGE);
}

async function loadEditableActivity(
  activities: ActivityRepository,
  activityId: string,
  tx: Prisma.TransactionClient,
): Promise<ActivityRecord> {
  const activity = await activities.findById(activityId, tx);
  if (!activity) {
    throw new NotFoundError("Atividade não encontrada.");
  }
  if (!canEditActivity(activity.status)) {
    throw new InvariantError("Atividade cancelada não pode ser editada.");
  }
  return activity;
}

function requireTask(activity: ActivityRecord, taskId: string): ActivityTaskRecord {
  const task = activity.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new NotFoundError("Tarefa não encontrada.");
  }
  return task;
}

function taskAuditEvent(
  activity: ActivityRecord,
  taskId: string,
  action: string,
  changes: ReturnType<typeof buildCreatedChanges>,
) {
  return {
    entityKind: AuditEntityKind.ActivityTask,
    entityId: taskId,
    action,
    activityId: activity.id,
    projectId: activity.project?.id ?? null,
    changes,
  };
}

async function persistChecklist(
  activities: ActivityRepository,
  activityId: string,
  actorId: string,
  tx: Prisma.TransactionClient,
): Promise<ActivityRecord> {
  await activities.touchUpdatedBy(activityId, actorId, tx);
  const updated = await activities.findById(activityId, tx);
  if (!updated) {
    throw new NotFoundError("Atividade não encontrada.");
  }
  return updated;
}

async function loadCurrentForNoOp(
  deps: ActivityChecklistDeps,
  activityId: string,
  expectedVersion: number,
): Promise<ActivityRecord> {
  const activity = await deps.activities.findById(activityId);
  if (!activity) {
    throw new NotFoundError("Atividade não encontrada.");
  }
  if (!canEditActivity(activity.status)) {
    throw new InvariantError("Atividade cancelada não pode ser editada.");
  }
  if (activity.version !== expectedVersion) {
    staleVersion();
  }
  return activity;
}

export async function addActivityTask(
  actor: LocalUser,
  input: AddActivityTaskInput,
  deps: ActivityChecklistDeps,
): Promise<ActivityChecklistResult> {
  const result = await runActivityAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "activity", id: input.activityId },
    load: (tx) => loadEditableActivity(deps.activities, input.activityId, tx),
    mutate: async (tx, loaded) => {
      await deps.activities.addTask(loaded.id, input.description, tx);
      return persistChecklist(deps.activities, loaded.id, actor.id, tx);
    },
    audit: ({ loaded, result: activity }) => {
      const created = activity.tasks.find(
        (task) => !loaded.tasks.some((previous) => previous.id === task.id),
      );
      if (!created) {
        throw new InvariantError("A tarefa criada não foi persistida.");
      }
      return taskAuditEvent(
        activity,
        created.id,
        AuditAction.created,
        buildCreatedChanges(activityTaskAuditSnapshot(created)),
      );
    },
  });

  return toChecklistResult(result);
}

export async function updateActivityTask(
  actor: LocalUser,
  input: UpdateActivityTaskInput,
  deps: ActivityChecklistDeps,
): Promise<ActivityChecklistResult> {
  const current = await loadCurrentForNoOp(deps, input.activityId, input.version);
  const existing = requireTask(current, input.taskId);
  if (existing.description === input.description) {
    return toChecklistResult(current);
  }

  const result = await runActivityAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "activity", id: input.activityId },
    load: (tx) => loadEditableActivity(deps.activities, input.activityId, tx),
    mutate: async (tx, loaded) => {
      requireTask(loaded, input.taskId);
      await deps.activities.updateTask(input.taskId, { description: input.description }, tx);
      return persistChecklist(deps.activities, loaded.id, actor.id, tx);
    },
    audit: ({ loaded, result: activity }) => {
      const before = requireTask(loaded, input.taskId);
      const after = requireTask(activity, input.taskId);
      return taskAuditEvent(
        activity,
        after.id,
        AuditAction.field_changed,
        buildUpdatedChanges(
          activityTaskAuditSnapshot(before),
          activityTaskAuditSnapshot(after),
          ACTIVITY_TASK_AUDIT_FIELDS,
        ),
      );
    },
  });

  return toChecklistResult(result);
}

export async function toggleActivityTask(
  actor: LocalUser,
  input: ToggleActivityTaskInput,
  deps: ActivityChecklistDeps,
): Promise<ActivityChecklistResult> {
  const current = await loadCurrentForNoOp(deps, input.activityId, input.version);
  const existing = requireTask(current, input.taskId);
  if (existing.isDone === input.isDone) {
    return toChecklistResult(current);
  }

  const result = await runActivityAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "activity", id: input.activityId },
    load: (tx) => loadEditableActivity(deps.activities, input.activityId, tx),
    mutate: async (tx, loaded) => {
      requireTask(loaded, input.taskId);
      await deps.activities.updateTask(input.taskId, { isDone: input.isDone }, tx);
      return persistChecklist(deps.activities, loaded.id, actor.id, tx);
    },
    audit: ({ loaded, result: activity }) => {
      const before = requireTask(loaded, input.taskId);
      const after = requireTask(activity, input.taskId);
      return taskAuditEvent(
        activity,
        after.id,
        AuditAction.field_changed,
        buildUpdatedChanges(
          activityTaskAuditSnapshot(before),
          activityTaskAuditSnapshot(after),
          ACTIVITY_TASK_AUDIT_FIELDS,
        ),
      );
    },
  });

  return toChecklistResult(result);
}

export async function removeActivityTask(
  actor: LocalUser,
  input: RemoveActivityTaskInput,
  deps: ActivityChecklistDeps,
): Promise<ActivityChecklistResult> {
  const result = await runActivityAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "activity", id: input.activityId },
    load: (tx) => loadEditableActivity(deps.activities, input.activityId, tx),
    mutate: async (tx, loaded) => {
      requireTask(loaded, input.taskId);
      await deps.activities.deleteTask(loaded.id, input.taskId, tx);
      return persistChecklist(deps.activities, loaded.id, actor.id, tx);
    },
    audit: ({ loaded, result: activity }) => {
      const removed = requireTask(loaded, input.taskId);
      return taskAuditEvent(
        activity,
        removed.id,
        AuditAction.deleted,
        buildUpdatedChanges(
          activityTaskAuditSnapshot(removed),
          { description: null, isDone: null, sortOrder: null },
          ACTIVITY_TASK_AUDIT_FIELDS,
        ),
      );
    },
  });

  return toChecklistResult(result);
}

export async function reorderActivityTasks(
  actor: LocalUser,
  input: ReorderActivityTasksInput,
  deps: ActivityChecklistDeps,
): Promise<ActivityChecklistResult> {
  const current = await loadCurrentForNoOp(deps, input.activityId, input.version);
  const currentIds = current.tasks.map((task) => task.id);
  if (!isTaskOrderPermutation(input.orderedTaskIds, currentIds)) {
    throw new ValidationError("A ordem das tarefas é inválida.", {
      orderedTaskIds: ["A ordem deve incluir todas as tarefas da atividade."],
    });
  }
  const unchanged = currentIds.every((id, index) => id === input.orderedTaskIds[index]);
  if (unchanged) {
    return toChecklistResult(current);
  }

  const result = await runActivityAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "activity", id: input.activityId },
    load: (tx) => loadEditableActivity(deps.activities, input.activityId, tx),
    mutate: async (tx, loaded) => {
      const loadedIds = loaded.tasks.map((task) => task.id);
      if (!isTaskOrderPermutation(input.orderedTaskIds, loadedIds)) {
        throw new ValidationError("A ordem das tarefas é inválida.", {
          orderedTaskIds: ["A ordem deve incluir todas as tarefas da atividade."],
        });
      }
      await deps.activities.reorderTasks(loaded.id, input.orderedTaskIds, tx);
      return persistChecklist(deps.activities, loaded.id, actor.id, tx);
    },
    audit: ({ loaded, result: activity }) => {
      const beforeById = new Map(loaded.tasks.map((task) => [task.id, task]));
      const events = activity.tasks
        .filter((task) => beforeById.get(task.id)?.sortOrder !== task.sortOrder)
        .map((task) => {
          const before = beforeById.get(task.id);
          if (!before) {
            throw new InvariantError("Tarefa reordenada não encontrada no estado anterior.");
          }
          return taskAuditEvent(
            activity,
            task.id,
            AuditAction.field_changed,
            buildUpdatedChanges(
              activityTaskAuditSnapshot(before),
              activityTaskAuditSnapshot(task),
              ACTIVITY_TASK_AUDIT_FIELDS,
            ),
          );
        });
      if (events.length === 0) {
        throw new InvariantError("A reordenação não alterou nenhuma tarefa.");
      }
      return events;
    },
  });

  return toChecklistResult(result);
}
