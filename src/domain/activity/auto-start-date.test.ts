import { describe, expect, it } from "vitest";
import { ActivityStatus } from "@/domain/activity/enums";
import {
  resolveStartDateForDestination,
  resolveStartDateOnCreate,
} from "@/domain/activity/auto-start-date";

describe("resolveStartDateOnCreate", () => {
  it("fills today when creating already in progress without a start date", () => {
    expect(resolveStartDateOnCreate(ActivityStatus.IN_PROGRESS, null, "2026-09-10")).toBe(
      "2026-09-10",
    );
  });

  it("does not overwrite an informed start date", () => {
    expect(
      resolveStartDateOnCreate(ActivityStatus.IN_PROGRESS, "2026-08-25", "2026-09-10"),
    ).toBe("2026-08-25");
  });

  it("does not invent a start when creating already done (DE-09)", () => {
    expect(resolveStartDateOnCreate(ActivityStatus.DONE, null, "2026-09-10")).toBeNull();
  });

  it("leaves backlog without a start date", () => {
    expect(resolveStartDateOnCreate(ActivityStatus.BACKLOG, null, "2026-09-10")).toBeNull();
  });
});

describe("resolveStartDateForDestination", () => {
  it("fills today when moving to In progress without a start date (DE-23)", () => {
    expect(
      resolveStartDateForDestination(ActivityStatus.IN_PROGRESS, null, "2026-09-10"),
    ).toBe("2026-09-10");
  });

  it("does not fill start when completing directly (DE-09)", () => {
    expect(resolveStartDateForDestination(ActivityStatus.DONE, null, "2026-09-10")).toBeNull();
  });
});

