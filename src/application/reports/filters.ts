import { EFFORT_FILTER_UNSET } from "@/application/activities/types";
import {
  areaIdsFromPortrait,
  asPortraitId,
  asPortraitIdList,
  isPortraitAbsent,
  type ReconstructedActivityPortrait,
} from "@/application/audit/reconstruct-portrait";
import type { ManagementDimensionFilters } from "@/application/reports/types";

/**
 * DE-17: dashboard/report filters match portrait values.
 * AUSENTE never matches a positive filter (the activity stays out of P).
 */
export function matchesManagementFilters(
  portrait: ReconstructedActivityPortrait,
  filters: ManagementDimensionFilters | undefined,
): boolean {
  if (!filters) {
    return true;
  }

  if (filters.status && portrait.status !== filters.status) {
    return false;
  }

  if (filters.type && portrait.tipo !== filters.type) {
    return false;
  }

  if (filters.ownerId && asPortraitId(portrait.responsavelId) !== filters.ownerId) {
    return false;
  }

  if (filters.domainId && asPortraitId(portrait.dominioId) !== filters.domainId) {
    return false;
  }

  if (filters.projectId && asPortraitId(portrait.projetoId) !== filters.projectId) {
    return false;
  }

  if (filters.nature && portrait.natureza !== filters.nature) {
    return false;
  }

  if (filters.priority && portrait.prioridade !== filters.priority) {
    return false;
  }

  if (filters.architectureRole && portrait.papelArquitetura !== filters.architectureRole) {
    return false;
  }

  if (filters.effort === EFFORT_FILTER_UNSET) {
    if (isPortraitAbsent(portrait.esforco) || portrait.esforco !== null) {
      return false;
    }
  } else if (filters.effort && portrait.esforco !== filters.effort) {
    return false;
  }

  if (filters.areaId && !areaIdsFromPortrait(portrait).has(filters.areaId)) {
    return false;
  }

  if (filters.participantId) {
    const participants = asPortraitIdList(portrait.participanteIds);
    if (!participants.includes(filters.participantId)) {
      return false;
    }
  }

  return true;
}
