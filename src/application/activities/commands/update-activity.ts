import type { LocalUser } from "@/domain/identity/local-user";
import { canEditActivity } from "@/domain/activity/enums";
import { InvariantError, NotFoundError } from "@/domain/errors";
import { instantToCivilDate } from "@/domain/calendar/civil-date";
import { systemClock } from "@/application/ports/clock";
import {
  AuditAction,
  AuditEntityKind,
  buildActivityUpdatedChanges,
} from "@/application/audit";
import type { UpdateActivityInput } from "@/application/activities/schemas";
import type { ActivityRecord } from "@/application/activities/types";
import {
  assertActiveOwner,
  assertCompletedDateNotFuture,
  assertInvolvedAreas,
  assertParticipants,
  assertProjectLink,
  assertUsableDomain,
  assertUsableRequestingArea,
} from "@/application/activities/assert-associations";
import type { ActivityCommandDeps } from "@/application/activities/commands/create-activity";
import { runActivityAudited } from "@/application/activities/run-activity-audited";
import { toActivityPortrait } from "@/application/activities/to-activity-audit";
import { toWriteData } from "@/application/activities/to-write-data";

const APP_TIME_ZONE = "America/Sao_Paulo";

export async function updateActivity(
  actor: LocalUser,
  input: UpdateActivityInput,
  deps: ActivityCommandDeps,
): Promise<ActivityRecord> {
  const clock = deps.clock ?? systemClock;
  const today = instantToCivilDate(clock.now(), APP_TIME_ZONE);
  const data = toWriteData(input);
  assertCompletedDateNotFuture(data.completedDate, today);

  return runActivityAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "activity", id: input.id },
    load: async (tx) => {
      const existing = await deps.activities.findById(input.id, tx);
      if (!existing) {
        throw new NotFoundError("Atividade não encontrada.");
      }
      if (!canEditActivity(existing.status)) {
        throw new InvariantError("Atividade cancelada não pode ser editada.");
      }

      await assertProjectLink(
        data.type,
        data.projectId,
        deps.projects,
        tx,
        existing.project?.id ?? null,
      );
      await assertUsableRequestingArea(
        data.requestingAreaId,
        deps.areas,
        tx,
        existing.requestingArea.id,
      );
      await assertUsableDomain(data.domainId, deps.domains, tx, existing.domain.id);
      await assertActiveOwner(data.ownerId, deps.users, tx);
      await assertParticipants(
        data.participantIds,
        deps.users,
        tx,
        new Set(existing.participants.map((participant) => participant.id)),
      );
      await assertInvolvedAreas(
        data.involvedAreaIds,
        deps.areas,
        tx,
        new Set(existing.involvedAreas.map((area) => area.id)),
      );
      return existing;
    },
    mutate: (tx, loaded) => {
      if (!loaded) {
        throw new NotFoundError("Atividade não encontrada.");
      }
      return deps.activities.update(loaded.id, data, actor.id, tx);
    },
    audit: ({ loaded, result }) => ({
      entityKind: AuditEntityKind.Activity,
      entityId: result.id,
      action: AuditAction.field_changed,
      activityId: result.id,
      projectId: result.project?.id ?? null,
      changes: buildActivityUpdatedChanges(toActivityPortrait(loaded), toActivityPortrait(result)),
    }),
  });
}
