import { describe, expect, it } from "vitest";
import {
  checklistProgress,
  formatChecklistProgress,
  isTaskOrderPermutation,
} from "@/domain/activity/checklist";

describe("checklist progress (RN-20)", () => {
  it("allows zero tasks as 0/0", () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0 });
    expect(formatChecklistProgress([])).toBe("0/0");
  });

  it("counts persisted done items over the total", () => {
    const tasks = [{ isDone: true }, { isDone: false }, { isDone: true }];
    expect(checklistProgress(tasks)).toEqual({ done: 2, total: 3 });
    expect(formatChecklistProgress(tasks)).toBe("2/3");
  });
});

describe("isTaskOrderPermutation", () => {
  it("accepts a rearrangement of the same ids", () => {
    expect(isTaskOrderPermutation(["c", "a", "b"], ["a", "b", "c"])).toBe(true);
    expect(isTaskOrderPermutation([], [])).toBe(true);
  });

  it("rejects extras, missing ids, or duplicates", () => {
    expect(isTaskOrderPermutation(["a", "b"], ["a", "b", "c"])).toBe(false);
    expect(isTaskOrderPermutation(["a", "b", "d"], ["a", "b", "c"])).toBe(false);
    expect(isTaskOrderPermutation(["a", "a"], ["a", "b"])).toBe(false);
  });
});
