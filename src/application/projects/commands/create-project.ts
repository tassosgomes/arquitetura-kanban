import type { LocalUser } from "@/domain/identity/local-user";
import { isActiveProjectStatus } from "@/domain/project/project-status";
import { normalizedCatalogName } from "@/application/catalogs/assert-unique-active-name";
import type { AreaRepository } from "@/application/ports/catalog-repositories";
import type { CatalogUserRepository } from "@/application/ports/catalog-repositories";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { AuditedPrismaClient } from "@/infrastructure/db/audited-transaction";
import {
  AuditAction,
  AuditEntityKind,
  buildCreatedChanges,
} from "@/application/audit";
import type { CreateProjectInput } from "@/application/projects/schemas";
import type { ProjectRecord, ProjectWriteData } from "@/application/projects/types";
import {
  assertParticipants,
  assertUniqueActiveProjectName,
  assertUsableArea,
} from "@/application/projects/assert-associations";
import { runProjectAudited } from "@/application/projects/run-project-audited";
import { toProjectAudit } from "@/application/projects/to-project-audit";

export type ProjectCommandDeps = {
  projects: ProjectRepository;
  areas: AreaRepository;
  users: CatalogUserRepository;
  prisma: AuditedPrismaClient;
};

export function toWriteData(input: {
  name: string;
  description: string | null;
  responsibleAreaId: string;
  externalResponsible: string | null;
  participantIds: string[];
  architectureRole: ProjectWriteData["architectureRole"];
  nature: ProjectWriteData["nature"];
  startDate: string | null;
  expectedEndDate: string | null;
  status: ProjectWriteData["status"];
}): ProjectWriteData {
  const name = input.name.trim();
  return {
    name,
    nameNormalized: normalizedCatalogName(name),
    description: input.description,
    responsibleAreaId: input.responsibleAreaId,
    externalResponsible: input.externalResponsible,
    nature: input.nature,
    architectureRole: input.architectureRole,
    participantIds: input.participantIds,
    startDate: input.startDate,
    expectedEndDate: input.expectedEndDate,
    status: input.status,
  };
}

export async function createProject(
  actor: LocalUser,
  input: CreateProjectInput,
  deps: ProjectCommandDeps,
): Promise<ProjectRecord> {
  const data = toWriteData(input);

  return runProjectAudited(deps.prisma, actor, {
    load: async (tx) => {
      if (isActiveProjectStatus(data.status)) {
        const duplicate = await deps.projects.findActiveByNameNormalized(data.nameNormalized, tx);
        assertUniqueActiveProjectName(duplicate);
      }
      await assertUsableArea(data.responsibleAreaId, deps.areas, tx);
      await assertParticipants(data.participantIds, deps.users, tx, new Set());
      return null;
    },
    mutate: (tx) => deps.projects.create(data, actor.id, tx),
    audit: ({ result }) => ({
      entityKind: AuditEntityKind.Project,
      entityId: result.id,
      action: AuditAction.created,
      projectId: result.id,
      changes: buildCreatedChanges(toProjectAudit(result)),
    }),
  });
}
