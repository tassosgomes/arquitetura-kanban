import { describe, expect, it } from "vitest";
import { REPORT_PAGE_SIZE, paginateItems } from "@/application/reports/pagination";

describe("report pagination (T27)", () => {
  it("slices only the requested page", () => {
    const items = ["a", "b", "c", "d", "e"];
    const first = paginateItems(items, 1, 2);
    expect(first.items).toEqual(["a", "b"]);
    expect(first.total).toBe(5);
    expect(first.totalPages).toBe(3);

    const last = paginateItems(items, 3, 2);
    expect(last.items).toEqual(["e"]);
    expect(last.page).toBe(3);
  });

  it("clamps out-of-range pages and defaults the page size", () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    expect(paginateItems(items, 0).page).toBe(1);
    expect(paginateItems(items, 99).page).toBe(2);
    expect(paginateItems(items, 1).pageSize).toBe(REPORT_PAGE_SIZE);
    expect(paginateItems([], 1).items).toEqual([]);
    expect(paginateItems([], 1).totalPages).toBe(1);
  });
});
