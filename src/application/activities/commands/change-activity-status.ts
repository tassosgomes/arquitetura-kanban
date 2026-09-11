import type { LocalUser } from "@/domain/identity/local-user";
import { ActivityStatus } from "@/domain/activity/enums";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import { instantToCivilDate } from "@/domain/calendar/civil-date";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";
import { systemClock } from "@/application/ports/clock";
import {
  AuditAction,
  AuditEntityKind,
  buildActivityUpdatedChanges,
  type AuditEventWrite,
  type AuditFieldChange,
} from "@/application/audit";
import type { ChangeActivityStatusInput } from "@/application/activities/schemas";
import type { ActivityRecord } from "@/application/activities/types";
import type { ActivityCommandDeps } from "@/application/activities/commands/create-activity";
import { runActivityAudited } from "@/application/activities/run-activity-audited";
import { toActivityPortrait } from "@/application/activities/to-activity-audit";
import {
  applyStatusTransitionDates,
  assertStatusTransitionAllowed,
  DEFAULT_REOPEN_STATUS,
  isStatusTransitionNoOp,
} from "@/domain/activity/status-transition";

export type ChangeActivityStatusDeps = Pick<ActivityCommandDeps, "activities" | "prisma" | "clock">;

function resolveTargetStatus(
  current: ActivityStatus,
  requested: ActivityStatus | undefined,
): ActivityStatus {
  if (requested !== undefined) {
    return requested;
  }
  if (current === ActivityStatus.DONE) {
    return DEFAULT_REOPEN_STATUS;
  }
  throw new ValidationError("Informe o status de destino.", {
    status: ["Selecione o status de destino."],
  });
}

function conflict(): never {
  throw new ConflictError("Esta atividade foi atualizada por outra pessoa. Recarregue os dados.");
}

export async function changeActivityStatus(
  actor: LocalUser,
  input: ChangeActivityStatusInput,
  deps: ChangeActivityStatusDeps,
): Promise<ActivityRecord> {
  const clock = deps.clock ?? systemClock;
  const existing = await deps.activities.findById(input.id);
  if (!existing) {
    throw new NotFoundError("Atividade não encontrada.");
  }
  if (existing.version !== input.version) {
    conflict();
  }

  const toStatus = resolveTargetStatus(existing.status, input.status);
  assertStatusTransitionAllowed(existing.status, toStatus);

  if (isStatusTransitionNoOp(existing.status, toStatus)) {
    return existing;
  }

  const today = instantToCivilDate(clock.now(), APP_TIME_ZONE);
  const dates = applyStatusTransitionDates({
    from: existing.status,
    to: toStatus,
    dates: {
      startDate: existing.startDate,
      completedDate: existing.completedDate,
      cancelledDate: existing.cancelledDate,
    },
    today,
  });

  return runActivityAudited(deps.prisma, actor, {
    clock,
    expectedVersion: input.version,
    versioned: { model: "activity", id: input.id },
    load: async (tx) => {
      const loaded = await deps.activities.findById(input.id, tx);
      if (!loaded) {
        throw new NotFoundError("Atividade não encontrada.");
      }
      return loaded;
    },
    mutate: (tx, loaded) => {
      if (!loaded) {
        throw new NotFoundError("Atividade não encontrada.");
      }
      return deps.activities.updateStatus(
        loaded.id,
        { status: toStatus, ...dates },
        actor.id,
        tx,
      );
    },
    audit: ({ loaded, result }) => {
      const portraitChanges = buildActivityUpdatedChanges(
        toActivityPortrait(loaded),
        toActivityPortrait(result),
      );
      const base = {
        entityKind: AuditEntityKind.Activity,
        entityId: result.id,
        activityId: result.id,
        projectId: result.project?.id ?? null,
      };
      const events: AuditEventWrite[] = [
        {
          ...base,
          action:
            toStatus === ActivityStatus.CANCELLED
              ? AuditAction.cancelled
              : AuditAction.status_changed,
          changes: portraitChanges,
        },
      ];

      const dateKeys = ["dataInicio", "dataConclusao", "dataCancelamento"] as const;
      const dateFields: Record<string, AuditFieldChange> = {};
      for (const key of dateKeys) {
        const field = portraitChanges.fields[key];
        if (field && field.before !== field.after) {
          dateFields[key] = field;
        }
      }
      if (Object.keys(dateFields).length > 0) {
        events.push({
          ...base,
          action: AuditAction.field_changed,
          changes: { fields: dateFields },
        });
      }

      return events;
    },
  });
}
