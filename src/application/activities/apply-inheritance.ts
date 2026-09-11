import type { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import { ActivityType } from "@/domain/activity/enums";
import type { ActivityProjectDefaults } from "@/application/activities/types";

export type InheritanceFields = {
  ownerId?: string;
  participantIds?: string[];
  nature?: Nature;
  architectureRole?: ArchitectureRole;
  requestingAreaId?: string;
};

/**
 * DE-15 / decisão 8: prefill pontual na criação vinculada.
 * Campos vazios/omitidos recebem o valor do projeto. Ad hoc: sem herança.
 * `participantIds: []` explícito não herda (o usuário desmarcou todos).
 */
export function applyProjectInheritance<T extends InheritanceFields & { type: ActivityType }>(
  input: T,
  defaults: ActivityProjectDefaults | null,
): T & {
  ownerId: string | undefined;
  participantIds: string[];
  nature: Nature | undefined;
  architectureRole: ArchitectureRole | undefined;
  requestingAreaId: string | undefined;
} {
  if (input.type !== ActivityType.PROJECT || !defaults) {
    return {
      ...input,
      ownerId: input.ownerId,
      participantIds: input.participantIds ?? [],
      nature: input.nature,
      architectureRole: input.architectureRole,
      requestingAreaId: input.requestingAreaId,
    };
  }

  return {
    ...input,
    ownerId: input.ownerId || defaults.ownerId,
    participantIds: input.participantIds ?? defaults.participantIds,
    nature: input.nature ?? defaults.nature,
    architectureRole: input.architectureRole ?? defaults.architectureRole,
    requestingAreaId: input.requestingAreaId || defaults.requestingAreaId,
  };
}

export function toActivityProjectDefaults(project: {
  id: string;
  architectureOwner: { id: string };
  participants: { id: string }[];
  nature: Nature;
  architectureRole: ArchitectureRole;
  responsibleArea: { id: string };
}): ActivityProjectDefaults {
  return {
    projectId: project.id,
    ownerId: project.architectureOwner.id,
    participantIds: project.participants.map((participant) => participant.id),
    nature: project.nature,
    architectureRole: project.architectureRole,
    requestingAreaId: project.responsibleArea.id,
  };
}
