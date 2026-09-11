import type { LocalUser } from "@/domain/identity/local-user";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { ActivityListFilter, ActivityListItem } from "@/application/activities/types";

export async function listActivities(
  _actor: LocalUser,
  filter: ActivityListFilter,
  activities: ActivityRepository,
): Promise<ActivityListItem[]> {
  return activities.list(filter);
}
