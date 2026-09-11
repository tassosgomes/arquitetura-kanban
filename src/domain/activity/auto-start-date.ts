import { ActivityStatus } from "@/domain/activity/enums";

/**
 * DE-23: destination Em andamento with no start date fills today's civil day.
 * Never overwrites an existing start (manual, inherited, or previously filled).
 * Direct conclusion (DE-09) does not invent a start.
 */
export function resolveStartDateForDestination(
  destination: ActivityStatus,
  startDate: string | null,
  today: string,
): string | null {
  if (startDate) {
    return startDate;
  }
  if (destination === ActivityStatus.IN_PROGRESS) {
    return today;
  }
  return null;
}

/**
 * Create-time DE-23: if the activity is already Em andamento and has no start date,
 * fill today's civil day. Do not invent a start when creating already Concluído (DE-09).
 */
export function resolveStartDateOnCreate(
  status: ActivityStatus,
  startDate: string | null,
  today: string,
): string | null {
  return resolveStartDateForDestination(status, startDate, today);
}
