import {
  PROJECT_AUDIT_FIELDS,
  toAuditDate,
  toAuditIdList,
  type ProjectAuditField,
} from "@/application/audit";
import type { AuditJsonValue } from "@/application/audit";
import type { ProjectRecord } from "@/application/projects/types";

export function toProjectAudit(
  project: ProjectRecord,
): Record<ProjectAuditField, AuditJsonValue> {
  return {
    name: project.name,
    status: project.status,
    responsibleAreaId: project.responsibleArea.id,
    nature: project.nature,
    architectureRole: project.architectureRole,
    participantIds: toAuditIdList(project.participants.map((participant) => participant.id)),
    startDate: toAuditDate(project.startDate),
    expectedEndDate: toAuditDate(project.expectedEndDate),
  };
}

export { PROJECT_AUDIT_FIELDS };
