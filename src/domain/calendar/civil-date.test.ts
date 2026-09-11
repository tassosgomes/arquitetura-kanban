import { describe, expect, it } from "vitest";
import {
  civilDateToUtcMidnight,
  instantToCivilDate,
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

  it("converts instants to America/Sao_Paulo civil days (DE-21 / FX-14)", () => {
    const zone = "America/Sao_Paulo";
    expect(instantToCivilDate(new Date("2026-09-01T01:30:00.000Z"), zone)).toBe("2026-08-31");
    expect(instantToCivilDate(new Date("2026-09-01T03:00:00.000Z"), zone)).toBe("2026-09-01");
    expect(instantToCivilDate(new Date("2026-09-10T15:00:00-03:00"), zone)).toBe("2026-09-10");
  });
});
