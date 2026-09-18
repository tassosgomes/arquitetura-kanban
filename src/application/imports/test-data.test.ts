import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { summarizeTestData, testDataHash, testDataSchema } from "./test-data";

const fixture = () => JSON.parse(readFileSync("docs/massa-dados.normalizada.json", "utf8"));

describe("normalized test fixture", () => {
  it("preserves the distinct S3 tasks, removes the exact duplicate and balances owners", () => {
    const data = testDataSchema.parse(fixture());
    const summary = summarizeTestData(data);
    expect(summary.activities).toBe(47);
    expect(summary.projects).toBe(41);
    expect(Object.values(summary.owners).sort()).toEqual([11, 12, 12, 12]);
    expect(data.activities.filter((a) => a.title.includes("padrões de uso storage"))).toHaveLength(2);
    expect(data.activities.filter((a) => a.projectKey === "disponibilizar-as-consultas-para-o-ecad")).toHaveLength(1);
    expect(data.activities.filter((a) => a.priority === "HIGH")).toHaveLength(3);
    for (const a of data.activities) {
      for (const date of [a.startDate, a.expectedEndDate, a.completedDate].filter((d) => d !== null)) {
        const age = (Date.parse(data.referenceDate) - Date.parse(date)) / 86_400_000;
        expect(age).toBeGreaterThanOrEqual(0);
        expect(age).toBeLessThanOrEqual(90);
      }
    }
  });

  it("rejects duplicate keys, dangling projects and inconsistent lifecycle dates", () => {
    const duplicate = fixture();
    duplicate.activities.push(duplicate.activities[0]);
    expect(testDataSchema.safeParse(duplicate).success).toBe(false);
    const dangling = fixture();
    dangling.activities[0].projectKey = "missing";
    expect(testDataSchema.safeParse(dangling).success).toBe(false);
    const dates = fixture();
    dates.activities[0].status = "DONE";
    expect(testDataSchema.safeParse(dates).success).toBe(false);
    const changed = fixture();
    changed.activities[0].title += " changed";
    expect(testDataHash(testDataSchema.parse(changed))).not.toBe(testDataHash(testDataSchema.parse(fixture())));
  });
});
