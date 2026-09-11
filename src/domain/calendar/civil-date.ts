/**
 * Calendar DATE (YYYY-MM-DD) helpers. Planning dates are civil days, not instants
 * (ADR-019). Invalid calendar dates (e.g. 2026-02-31) are rejected.
 */

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCivilDateString(value: string): boolean {
  const match = CIVIL_DATE.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** Persist PostgreSQL DATE as midnight UTC for that civil day. */
export function civilDateToUtcMidnight(value: string): Date {
  if (!isCivilDateString(value)) {
    throw new RangeError(`Invalid civil date: ${value}`);
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

export function utcMidnightToCivilDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
