import type { LocalUser } from "@/domain/identity/local-user";
import { InvariantError, NotFoundError } from "@/domain/errors";
import { ProjectStatus } from "@/domain/project/project-status";
import {
  AuditAction,
  AuditEntityKind,
  buildUpdatedChanges,
  PROJECT_AUDIT_FIELDS,
} from "@/application/audit";
import type { CancelProjectInput } from "@/application/projects/schemas";
import type { ProjectRecord } from "@/application/projects/types";
import type { ProjectCommandDeps } from "@/application/projects/commands/create-project";
import { runProjectAudited } from "@/application/projects/run-project-audited";
import { toProjectAudit } from "@/application/projects/to-project-audit";

export async function cancelProject(
  actor: LocalUser,
  input: CancelProjectInput,
  deps: ProjectCommandDeps,
): Promise<ProjectRecord> {
  return runProjectAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "project", id: input.id },
    load: async (tx) => {
      const existing = await deps.projects.findById(input.id, tx);
      if (!existing) {
        throw new NotFoundError("Projeto não encontrado.");
      }
      if (existing.status === ProjectStatus.CANCELLED) {
        throw new InvariantError("Projeto já cancelado.");
      }
      return existing;
    },
    mutate: (tx, loaded) => {
      if (!loaded) {
        throw new NotFoundError("Projeto não encontrado.");
      }
      return deps.projects.cancel(loaded.id, actor.id, tx);
    },
    audit: ({ loaded, result }) => ({
      entityKind: AuditEntityKind.Project,
      entityId: result.id,
      action: AuditAction.cancelled,
      projectId: result.id,
      changes: buildUpdatedChanges(
        toProjectAudit(loaded),
        toProjectAudit(result),
        PROJECT_AUDIT_FIELDS,
      ),
    }),
  });
}
