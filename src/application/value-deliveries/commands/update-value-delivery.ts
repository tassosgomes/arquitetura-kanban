import type { LocalUser } from "@/domain/identity/local-user";
import { InvariantError, NotFoundError } from "@/domain/errors";
import { canEditProject } from "@/domain/project/project-status";
import {
  AuditAction,
  AuditEntityKind,
  buildUpdatedChanges,
  VALUE_DELIVERY_AUDIT_FIELDS,
} from "@/application/audit";
import type { UpdateValueDeliveryInput } from "@/application/value-deliveries/schemas";
import type { ValueDeliveryRecord } from "@/application/value-deliveries/types";
import type { ValueDeliveryCommandDeps } from "@/application/value-deliveries/commands/create-value-delivery";
import { runValueDeliveryAudited } from "@/application/value-deliveries/run-value-delivery-audited";
import { toValueDeliveryAudit } from "@/application/value-deliveries/to-value-delivery-audit";

export async function updateValueDelivery(
  actor: LocalUser,
  input: UpdateValueDeliveryInput,
  deps: ValueDeliveryCommandDeps,
): Promise<ValueDeliveryRecord> {
  return runValueDeliveryAudited(deps.prisma, actor, {
    expectedVersion: input.version,
    versioned: { model: "valueDelivery", id: input.id },
    load: async (tx) => {
      const existing = await deps.valueDeliveries.findById(input.id, tx);
      if (!existing) {
        throw new NotFoundError("Entrega de valor não encontrada.");
      }
      const project = await deps.projects.findById(existing.projectId, tx);
      if (!project) {
        throw new NotFoundError("Projeto não encontrado.");
      }
      if (!canEditProject(project.status)) {
        throw new InvariantError("Projeto cancelado: entregas de valor são somente leitura.");
      }
      return existing;
    },
    mutate: (tx, loaded) => {
      if (!loaded) {
        throw new NotFoundError("Entrega de valor não encontrada.");
      }
      return deps.valueDeliveries.update(
        loaded.id,
        {
          title: input.title,
          contentMarkdown: input.contentMarkdown,
          referenceDate: input.referenceDate,
        },
        tx,
      );
    },
    audit: ({ loaded, result }) => ({
      entityKind: AuditEntityKind.ValueDelivery,
      entityId: result.id,
      action: AuditAction.field_changed,
      projectId: result.projectId,
      changes: buildUpdatedChanges(
        toValueDeliveryAudit(loaded),
        toValueDeliveryAudit(result),
        VALUE_DELIVERY_AUDIT_FIELDS,
      ),
    }),
  });
}
