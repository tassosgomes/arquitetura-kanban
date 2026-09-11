import type { LocalUser } from "@/domain/identity/local-user";
import { InvariantError, NotFoundError } from "@/domain/errors";
import { canEditProject } from "@/domain/project/project-status";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ValueDeliveryRepository } from "@/application/ports/value-delivery-repository";
import type { AuditedPrismaClient } from "@/infrastructure/db/audited-transaction";
import {
  AuditAction,
  AuditEntityKind,
  buildCreatedChanges,
} from "@/application/audit";
import type { CreateValueDeliveryInput } from "@/application/value-deliveries/schemas";
import type { ValueDeliveryRecord } from "@/application/value-deliveries/types";
import { runValueDeliveryAudited } from "@/application/value-deliveries/run-value-delivery-audited";
import { toValueDeliveryAudit } from "@/application/value-deliveries/to-value-delivery-audit";

export type ValueDeliveryCommandDeps = {
  valueDeliveries: ValueDeliveryRepository;
  projects: ProjectRepository;
  prisma: AuditedPrismaClient;
};

export async function createValueDelivery(
  actor: LocalUser,
  input: CreateValueDeliveryInput,
  deps: ValueDeliveryCommandDeps,
): Promise<ValueDeliveryRecord> {
  return runValueDeliveryAudited(deps.prisma, actor, {
    load: async (tx) => {
      const project = await deps.projects.findById(input.projectId, tx);
      if (!project) {
        throw new NotFoundError("Projeto não encontrado.");
      }
      if (!canEditProject(project.status)) {
        throw new InvariantError("Projeto cancelado: entregas de valor são somente leitura.");
      }
      return null;
    },
    mutate: (tx) =>
      deps.valueDeliveries.create(
        {
          projectId: input.projectId,
          title: input.title,
          contentMarkdown: input.contentMarkdown,
          referenceDate: input.referenceDate,
        },
        actor.id,
        tx,
      ),
    audit: ({ result }) => ({
      entityKind: AuditEntityKind.ValueDelivery,
      entityId: result.id,
      action: AuditAction.created,
      projectId: result.projectId,
      changes: buildCreatedChanges(toValueDeliveryAudit(result)),
    }),
  });
}
