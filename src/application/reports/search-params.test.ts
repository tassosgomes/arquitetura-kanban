import { describe, expect, it } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import { EFFORT_FILTER_UNSET } from "@/application/activities/types";
import { PeriodPreset, TemporalQueryMode } from "@/application/temporal";
import {
  DEFAULT_MANAGEMENT_PERIOD,
  ManagementPeriodOption,
  ManagementShortcut,
  activeManagementShortcut,
  hasActiveManagementFilters,
  managementHref,
  parseManagementSearchParams,
  parsePageParam,
  serializeManagementFilterValues,
  serializeManagementQuery,
  toManagementQuery,
} from "@/application/reports/search-params";

const AREA_ID = "33333333-3333-4333-8333-333333333333";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const PARTICIPANT_ID = "22222222-2222-4222-8222-222222222222";

describe("management search params (T26)", () => {
  it("defaults to este mês without Kanban current-state flags", () => {
    const parsed = parseManagementSearchParams({});
    expect(parsed.error).toBeUndefined();
    expect(parsed.values.period).toBe(DEFAULT_MANAGEMENT_PERIOD);
    expect(parsed.values.period).toBe(ManagementPeriodOption.THIS_MONTH);
    expect(parsed.page).toBe(1);
    expect(parsed.query.temporal).toEqual({
      mode: TemporalQueryMode.PERIOD,
      period: PeriodPreset.THIS_MONTH,
    });
    expect(parsed.query.filters).toBeUndefined();
    expect(hasActiveManagementFilters(parsed.values)).toBe(false);
    expect(activeManagementShortcut(parsed.values)).toBe(ManagementShortcut.THIS_MONTH);
    expect(serializeManagementFilterValues(parsed.values).toString()).toBe("");
  });

  it("ignores Kanban mine/includeCancelled so DE-17 does not use current state", () => {
    const parsed = parseManagementSearchParams({
      mine: "1",
      includeCancelled: "1",
      period: "LAST_MONTH",
    });
    expect(parsed.query.temporal).toEqual({
      mode: TemporalQueryMode.PERIOD,
      period: PeriodPreset.LAST_MONTH,
    });
    expect(parsed.query.filters).toBeUndefined();
    expect("mine" in parsed.values).toBe(false);
    expect("includeCancelled" in parsed.values).toBe(false);
  });

  it("maps T19 presets, Todas and Sem planejamento", () => {
    expect(parseManagementSearchParams({ period: "ALL" }).query.temporal).toEqual({
      mode: TemporalQueryMode.ALL,
    });
    expect(parseManagementSearchParams({ period: "UNPLANNED" }).query.temporal).toEqual({
      mode: TemporalQueryMode.UNPLANNED,
    });
    expect(parseManagementSearchParams({ period: "THIS_WEEK" }).query.temporal).toEqual({
      mode: TemporalQueryMode.PERIOD,
      period: PeriodPreset.THIS_WEEK,
    });
    expect(parseManagementSearchParams({ period: "THIS_YEAR" }).query.temporal).toEqual({
      mode: TemporalQueryMode.PERIOD,
      period: PeriodPreset.THIS_YEAR,
    });
  });

  it("accepts a custom inclusive range and rejects inverted dates", () => {
    const ok = parseManagementSearchParams({
      period: "CUSTOM",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(ok.error).toBeUndefined();
    expect(ok.query.temporal).toEqual({
      mode: TemporalQueryMode.PERIOD,
      period: { from: "2026-08-01", to: "2026-08-31" },
    });

    const inverted = parseManagementSearchParams({
      period: "CUSTOM",
      from: "2026-09-10",
      to: "2026-09-01",
    });
    expect(inverted.error).toMatch(/final/i);
    expect(inverted.query.temporal).toEqual({ mode: TemporalQueryMode.ALL });
  });

  it("parses historical dimension filters including type (DE-17)", () => {
    const parsed = parseManagementSearchParams({
      area: AREA_ID,
      owner: OWNER_ID,
      participant: PARTICIPANT_ID,
      nature: Nature.STRATEGIC,
      priority: Priority.HIGH,
      role: ArchitectureRole.CONTRIBUTOR,
      effort: Effort.M,
      status: ActivityStatus.BLOCKED,
      type: ActivityType.PROJECT,
    });
    expect(parsed.query.filters).toEqual({
      areaId: AREA_ID,
      ownerId: OWNER_ID,
      participantId: PARTICIPANT_ID,
      nature: Nature.STRATEGIC,
      priority: Priority.HIGH,
      architectureRole: ArchitectureRole.CONTRIBUTOR,
      effort: Effort.M,
      status: ActivityStatus.BLOCKED,
      type: ActivityType.PROJECT,
    });
    expect(parsed.query.filters?.ownerId).not.toBe(parsed.query.filters?.participantId);
    expect(activeManagementShortcut(parsed.values)).toBeNull();
  });

  it("accepts effort unset and ignores invalid ids", () => {
    const parsed = parseManagementSearchParams({
      area: "not-a-uuid",
      project: "",
      nature: "NOPE",
      effort: EFFORT_FILTER_UNSET,
      type: "NOPE",
    });
    expect(parsed.values.areaId).toBeUndefined();
    expect(parsed.values.projectId).toBeUndefined();
    expect(parsed.values.nature).toBeUndefined();
    expect(parsed.values.type).toBeUndefined();
    expect(parsed.values.effort).toBe(EFFORT_FILTER_UNSET);
    expect(parsed.query.filters).toEqual({ effort: EFFORT_FILTER_UNSET });
  });

  it("roundtrips parse → serialize → parse for query and values", () => {
    const original = parseManagementSearchParams({
      period: "LAST_MONTH",
      area: AREA_ID,
      type: ActivityType.AD_HOC,
      effort: EFFORT_FILTER_UNSET,
    });
    const serialized = serializeManagementQuery(original.query);
    const again = parseManagementSearchParams(Object.fromEntries(serialized.entries()));
    expect(again.query).toEqual(original.query);

    const fromValues = serializeManagementFilterValues(original.values);
    expect(parseManagementSearchParams(Object.fromEntries(fromValues.entries())).values).toEqual(
      original.values,
    );
  });

  it("parses page for T27 without affecting the management query", () => {
    expect(parsePageParam({ page: "3" })).toBe(3);
    expect(parsePageParam({ page: "0" })).toBe(1);
    const withPage = serializeManagementFilterValues(
      { period: ManagementPeriodOption.THIS_MONTH, from: "", to: "" },
      { page: 2 },
    );
    expect(withPage.get("page")).toBe("2");
    expect(withPage.get("period")).toBeNull();
  });

  it("builds hrefs without a query string for the default period", () => {
    expect(
      managementHref("/dashboard", { period: ManagementPeriodOption.THIS_MONTH, from: "", to: "" }),
    ).toBe("/dashboard");
    expect(
      managementHref("/reports", { period: ManagementPeriodOption.LAST_MONTH, from: "", to: "" }),
    ).toBe("/reports?period=LAST_MONTH");
    expect(toManagementQuery({ period: ManagementPeriodOption.ALL, from: "", to: "" }).temporal.mode).toBe(
      TemporalQueryMode.ALL,
    );
  });
});
