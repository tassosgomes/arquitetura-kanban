import {
  civilDateToUtcMidnight,
  isCivilDateString,
  utcMidnightToCivilDate,
} from "@/domain/calendar/civil-date";

export {
  civilDateToUtcMidnight,
  isCivilDateString,
  utcMidnightToCivilDate,
} from "@/domain/calendar/civil-date";

/** Prisma `@db.Date` ↔ civil `YYYY-MM-DD` (America/Sao_Paulo planning days). */
export function toPrismaDate(value: string | null): Date | null {
  return value ? civilDateToUtcMidnight(value) : null;
}

export function fromPrismaDate(value: Date | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return utcMidnightToCivilDate(value);
}

export function isCivilDateStringOrEmpty(value: string): boolean {
  return value === "" || isCivilDateString(value);
}
