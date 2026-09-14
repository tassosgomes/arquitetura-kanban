import type { LocalUser } from "@/domain/identity/local-user";
import { ActivityStatus } from "@/domain/activity/enums";
import { instantToCivilDate } from "@/domain/calendar/civil-date";
import { resolveStartDateOnCreate } from "@/domain/activity/auto-start-date";
import type { Clock } from "@/application/ports/clock";
import { systemClock } from "@/application/ports/clock";
import type { AreaRepository, CatalogUserRepository, DomainRepository } from "@/application/ports/catalog-repositories";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AuditedPrismaClient } from "@/infrastructure/db/audited-transaction";
import {
  AuditAction,
  AuditEntityKind,
  buildActivityCreatedChanges,
} from "@/application/audit";
import type { CreateActivityInput } from "@/application/activities/schemas";
import type { ActivityRecord } from "@/application/activities/types";
import {
  applyProjectInheritance,
  toActivityProjectDefaults,
} from "@/application/activities/apply-inheritance";
import {
  assertActiveOwner,
  assertCompletedDateNotFuture,
  assertInvolvedAreas,
  assertParticipants,
  assertProjectLink,
  requireInheritedFields,
  assertUsableDomain,
  assertUsableRequestingArea,
} from "@/application/activities/assert-associations";
import { runActivityAudited } from "@/application/activities/run-activity-audited";
import { toActivityPortrait } from "@/application/activities/to-activity-audit";
import { toWriteData } from "@/application/activities/to-write-data";

const APP_TIME_ZONE = "America/Sao_Paulo";

export type ActivityCommandDeps = {
  activities: ActivityRepository;
  projects: ProjectRepository;
  areas: AreaRepository;
  domains: DomainRepository;
  users: CatalogUserRepository;
  prisma: AuditedPrismaClient;
  clock?: Clock;
};

export async function createActivity(
  actor: LocalUser,
  input: CreateActivityInput,
  deps: ActivityCommandDeps,
): Promise<ActivityRecord> {
  const clock = deps.clock ?? systemClock;
  const today = instantToCivilDate(clock.now(), APP_TIME_ZONE);

  return runActivityAudited(deps.prisma, actor, {
    clock,
    load: async (tx) => {
      const linked = await assertProjectLink(input.type, input.projectId, deps.projects, tx);
      const inheritedValues = applyProjectInheritance(
        input,
        linked ? toActivityProjectDefaults(linked) : null,
      );
      const inherited = requireInheritedFields(
        linked && !inheritedValues.ownerId
          ? { ...inheritedValues, ownerId: actor.id }
          : inheritedValues,
      );

      const startDate = resolveStartDateOnCreate(inherited.status, inherited.startDate, today);
      const completedDate =
        inherited.status === ActivityStatus.DONE ? inherited.completedDate : null;
      assertCompletedDateNotFuture(completedDate, today);

      await assertUsableRequestingArea(inherited.requestingAreaId, deps.areas, tx);
      await assertUsableDomain(inherited.domainId, deps.domains, tx);
      await assertActiveOwner(inherited.ownerId, deps.users, tx);
      await assertParticipants(inherited.participantIds, deps.users, tx, new Set());
      await assertInvolvedAreas(inherited.involvedAreaIds, deps.areas, tx, new Set());

      return toWriteData({
        ...inherited,
        startDate,
        completedDate,
      });
    },
    mutate: (tx, data) => deps.activities.create(data, actor.id, tx),
    audit: ({ result }) => ({
      entityKind: AuditEntityKind.Activity,
      entityId: result.id,
      action: AuditAction.created,
      activityId: result.id,
      projectId: result.project?.id ?? null,
      changes: buildActivityCreatedChanges(toActivityPortrait(result)),
    }),
  });
}
