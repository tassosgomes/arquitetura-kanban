import { ActivityStatus } from "@/domain/activity/enums";

/**
 * Create-time DE-23: if the activity is already Em andamento and has no start date,
 * fill today's civil day. Do not invent a start when creating already Concluído (DE-09).
 */
export function resolveStartDateOnCreate(
  status: ActivityStatus,
  startDate: string | null,
  today: string,
): string | null {
  if (startDate) {
    return startDate;
  }
  if (status === ActivityStatus.IN_PROGRESS) {
    return today;
  }
  return null;
}
