import type { LocalUser } from "@/domain/identity/local-user";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { ActivityRecord } from "@/application/activities/types";

export async function getActivity(
  _actor: LocalUser,
  id: string,
  activities: ActivityRepository,
): Promise<ActivityRecord | null> {
  return activities.findById(id);
}
