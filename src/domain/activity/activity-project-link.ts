import { ActivityType } from "@/domain/activity/enums";

/**
 * Invariante persistida também como CHECK SQL:
 * PROJECT ⇒ projectId presente; AD_HOC ⇒ projectId ausente.
 */
export function isActivityProjectLinkValid(
  type: ActivityType,
  projectId: string | null | undefined,
): boolean {
  const hasProject = projectId != null && projectId !== "";
  if (type === ActivityType.PROJECT) {
    return hasProject;
  }
  return !hasProject;
}
