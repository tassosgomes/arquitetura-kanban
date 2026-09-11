import type { LocalUser } from "@/domain/identity/local-user";
import { canEditProject, isActiveProjectStatus } from "@/domain/project/project-status";
import { InvariantError, NotFoundError } from "@/domain/errors";
import {
  AuditAction,
  AuditEntityKind,
  buildUpdatedChanges,
  PROJECT_AUDIT_FIELDS,
} from "@/application/audit";
import type { UpdateProjectInput } from "@/application/projects/schemas";
import type { ProjectRecord } from "@/application/projects/types";
import {
  assertActiveOwner,
  assertParticipants,
  assertUniqueActiveProjectName,
  assertUsableArea,
} from "@/application/projects/assert-associations";
import type { ProjectCommandDeps } from "@/application/projects/commands/create-project";
import { toWriteData } from "@/application/projects/commands/create-project";
import { runProjectAudited } from "@/application/projects/run-project-audited";
import { toProjectAudit } from "@/application/projects/to-project-audit";

export async function updateProject(
  actor: LocalUser,
  input: UpdateProjectInput,
  deps: ProjectCommandDeps,
): Promise<ProjectRecord> {
  const data = toWriteData(input);

  return runProjectAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "project", id: input.id },
    load: async (tx) => {
      const existing = await deps.projects.findById(input.id, tx);
      if (!existing) {
        throw new NotFoundError("Projeto não encontrado.");
      }
      if (!canEditProject(existing.status)) {
        throw new InvariantError("Projeto cancelado não pode ser editado.");
      }
      if (isActiveProjectStatus(data.status)) {
        const duplicate = await deps.projects.findActiveByNameNormalized(data.nameNormalized, tx);
        assertUniqueActiveProjectName(duplicate, input.id);
      }
      await assertUsableArea(data.responsibleAreaId, deps.areas, tx, existing.responsibleArea.id);
      await assertActiveOwner(data.architectureOwnerId, deps.users, tx);
      await assertParticipants(
        data.participantIds,
        deps.users,
        tx,
        new Set(existing.participants.map((participant) => participant.id)),
      );
      return existing;
    },
    mutate: (tx, loaded) => {
      if (!loaded) {
        throw new NotFoundError("Projeto não encontrado.");
      }
      return deps.projects.update(loaded.id, data, actor.id, tx);
    },
    audit: ({ loaded, result }) => ({
      entityKind: AuditEntityKind.Project,
      entityId: result.id,
      action: AuditAction.field_changed,
      projectId: result.id,
      changes: buildUpdatedChanges(
        toProjectAudit(loaded),
        toProjectAudit(result),
        PROJECT_AUDIT_FIELDS,
      ),
    }),
  });
}
