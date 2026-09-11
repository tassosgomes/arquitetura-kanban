import {
  toAuditDate,
  toAuditIdList,
  type ActivityPortrait,
} from "@/application/audit";
import type { ActivityRecord } from "@/application/activities/types";

export function toActivityPortrait(activity: ActivityRecord): ActivityPortrait {
  return {
    status: activity.status,
    responsavelId: activity.owner.id,
    participanteIds: toAuditIdList(activity.participants.map((participant) => participant.id)),
    areaSolicitanteId: activity.requestingArea.id,
    areaEnvolvidaIds: toAuditIdList(activity.involvedAreas.map((area) => area.id)),
    dominioId: activity.domain.id,
    natureza: activity.nature,
    papelArquitetura: activity.architectureRole,
    tipo: activity.type,
    projetoId: activity.project?.id ?? null,
    esforco: activity.effort,
    prioridade: activity.priority,
    dataInicio: toAuditDate(activity.startDate),
    dataConclusao: toAuditDate(activity.completedDate),
    dataCancelamento: toAuditDate(activity.cancelledDate),
    previsaoTermino: toAuditDate(activity.expectedEndDate),
  };
}
