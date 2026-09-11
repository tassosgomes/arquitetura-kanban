import { ActivityType } from "@/domain/activity/enums";
import type { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import type { ActivityWriteData } from "@/application/activities/types";

export function toWriteData(input: {
  title: string;
  description: string | null;
  observations: string | null;
  type: ActivityType;
  projectId: string | null;
  requestingAreaId: string;
  domainId: string;
  nature: Nature;
  architectureRole: ArchitectureRole;
  ownerId: string;
  participantIds: string[];
  involvedAreaIds: string[];
  priority: Priority;
  effort: Effort | null;
  status: ActivityWriteData["status"];
  startDate: string | null;
  expectedEndDate: string | null;
  completedDate: string | null;
}): ActivityWriteData {
  return {
    title: input.title.trim(),
    description: input.description,
    observations: input.observations,
    type: input.type,
    projectId: input.type === ActivityType.AD_HOC ? null : input.projectId,
    requestingAreaId: input.requestingAreaId,
    domainId: input.domainId,
    nature: input.nature,
    architectureRole: input.architectureRole,
    ownerId: input.ownerId,
    participantIds: input.participantIds,
    involvedAreaIds: input.involvedAreaIds,
    priority: input.priority,
    effort: input.effort,
    status: input.status,
    startDate: input.startDate,
    expectedEndDate: input.expectedEndDate,
    completedDate: input.status === "DONE" ? input.completedDate : null,
  };
}
