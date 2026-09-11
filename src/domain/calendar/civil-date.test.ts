import { describe, expect, it } from "vitest";
import {
  civilDateToUtcMidnight,
  isCivilDateString,
  utcMidnightToCivilDate,
} from "@/domain/calendar/civil-date";

describe("civil date (DATE calendar day)", () => {
  it("accepts real calendar days", () => {
    expect(isCivilDateString("2026-09-10")).toBe(true);
    expect(isCivilDateString("2024-02-29")).toBe(true);
  });

  it("rejects malformed or impossible days", () => {
    expect(isCivilDateString("")).toBe(false);
    expect(isCivilDateString("10/09/2026")).toBe(false);
    expect(isCivilDateString("2026-02-31")).toBe(false);
    expect(isCivilDateString("2026-13-01")).toBe(false);
  });

  it("round-trips through UTC midnight for Prisma DATE", () => {
    const stored = civilDateToUtcMidnight("2026-08-25");
    expect(stored.toISOString()).toBe("2026-08-25T00:00:00.000Z");
    expect(utcMidnightToCivilDate(stored)).toBe("2026-08-25");
  });
});
