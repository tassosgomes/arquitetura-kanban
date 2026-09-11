import { describe, expect, it } from "vitest";
import {
  parseManagementSearchParams,
  reportsCsvHref,
  serializeManagementQuery,
} from "@/application/reports/search-params";

describe("management search params page (T27)", () => {
  it("parses page for the UI and omits it from the CSV query", () => {
    const parsed = parseManagementSearchParams({ page: "3", period: "LAST_MONTH" });
    expect(parsed.page).toBe(3);
    expect(serializeManagementQuery(parsed.query).get("page")).toBeNull();
    expect(reportsCsvHref(parsed.query)).toBe("/api/reports/csv?period=LAST_MONTH");
  });

  it("treats invalid page as 1", () => {
    expect(parseManagementSearchParams({ page: "0" }).page).toBe(1);
    expect(parseManagementSearchParams({ page: "nope" }).page).toBe(1);
  });
});
