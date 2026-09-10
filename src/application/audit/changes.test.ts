import { describe, expect, it } from "vitest";
import {
  buildActivityCreatedChanges,
  buildActivityUpdatedChanges,
  buildCreatedChanges,
  buildUpdatedChanges,
} from "@/application/audit/changes";
import {
  ACTIVITY_PORTRAIT_FIELDS,
  toAuditDate,
  toAuditIdList,
} from "@/application/audit/portrait";

describe("audit changes builders", () => {
  it("stores a create snapshot with before: null for every field", () => {
    const changes = buildCreatedChanges({
      status: "BACKLOG",
      responsavelId: "owner-1",
    });

    expect(changes.snapshot).toEqual({
      status: "BACKLOG",
      responsavelId: "owner-1",
    });
    expect(changes.fields.status).toEqual({ before: null, after: "BACKLOG" });
    expect(changes.fields.responsavelId).toEqual({ before: null, after: "owner-1" });
  });

  it("records before/after for every portrait field on activity updates", () => {
    const changes = buildActivityUpdatedChanges(
      { status: "BACKLOG", responsavelId: "ana" },
      { status: "IN_PROGRESS", responsavelId: "carlos" },
    );

    expect(changes.snapshot).toBeUndefined();
    expect(Object.keys(changes.fields)).toEqual([...ACTIVITY_PORTRAIT_FIELDS]);
    expect(changes.fields.status).toEqual({ before: "BACKLOG", after: "IN_PROGRESS" });
    expect(changes.fields.responsavelId).toEqual({ before: "ana", after: "carlos" });
    expect(changes.fields.tipo).toEqual({ before: null, after: null });
  });

  it("includes unchanged keys when the caller lists them", () => {
    const changes = buildUpdatedChanges(
      { name: "Alpha", status: "PLANNED" },
      { name: "Beta", status: "PLANNED" },
      ["name", "status"],
    );

    expect(changes.fields.status).toEqual({ before: "PLANNED", after: "PLANNED" });
    expect(changes.fields.name).toEqual({ before: "Alpha", after: "Beta" });
  });

  it("serializes calendar dates and sorted id lists", () => {
    expect(toAuditDate(new Date("2026-08-25T00:00:00.000Z"))).toBe("2026-08-25");
    expect(toAuditDate("2026-09-18")).toBe("2026-09-18");
    expect(toAuditDate(null)).toBeNull();
    expect(toAuditIdList(["b", "a"])).toEqual(["a", "b"]);
  });

  it("fills every activity portrait key on create", () => {
    const changes = buildActivityCreatedChanges({
      status: "TODO",
      tipo: "AD_HOC",
    });

    expect(changes.snapshot?.status).toBe("TODO");
    expect(changes.snapshot?.tipo).toBe("AD_HOC");
    expect(changes.snapshot?.participanteIds).toEqual([]);
    expect(changes.snapshot?.esforco).toBeNull();
    expect(changes.fields.dataInicio).toEqual({ before: null, after: null });
  });
});
