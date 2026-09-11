import type { LocalUser } from "@/domain/identity/local-user";
import type { Clock } from "@/application/ports/clock";
import { systemClock } from "@/application/ports/clock";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { ActivityListFilter, ActivityListItem } from "@/application/activities/types";
import { filterByPeriod } from "@/application/temporal";

export async function listActivities(
  _actor: LocalUser,
  filter: ActivityListFilter,
  activities: ActivityRepository,
  clock: Clock = systemClock,
): Promise<ActivityListItem[]> {
  const items = await activities.list(filter);
  if (!filter.temporal) {
    return items;
  }
  return filterByPeriod(items, filter.temporal, clock.now());
}
