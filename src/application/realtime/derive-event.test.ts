import { describe, expect, it } from "vitest";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { deriveRealtimeEvents } from "@/application/realtime/derive-event";
import { RealtimeEventType } from "@/application/realtime/types";
import { buildCreatedChanges, buildUpdatedChanges } from "@/application/audit/changes";

const changes = buildCreatedChanges({ name: "x" });

describe("deriveRealtimeEvents", () => {
  it("maps activity create / update / status / checklist", () => {
    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.Activity,
          entityId: "a1",
          action: AuditAction.created,
          activityId: "a1",
          projectId: "p1",
          changes,
        },
      ]),
    ).toEqual([
      {
        type: RealtimeEventType.ActivityCreated,
        payload: { entityKind: "activity", entityId: "a1", projectId: "p1" },
      },
    ]);

    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.Activity,
          entityId: "a1",
          action: AuditAction.field_changed,
          activityId: "a1",
          changes: buildUpdatedChanges({ name: "a" }, { name: "b" }),
        },
      ]),
    ).toEqual([
      {
        type: RealtimeEventType.ActivityUpdated,
        payload: { entityKind: "activity", entityId: "a1" },
      },
    ]);

    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.Activity,
          entityId: "a1",
          action: AuditAction.status_changed,
          activityId: "a1",
          projectId: "p1",
          changes,
        },
        {
          entityKind: AuditEntityKind.Activity,
          entityId: "a1",
          action: AuditAction.field_changed,
          activityId: "a1",
          projectId: "p1",
          changes: buildUpdatedChanges({ dataConclusao: null }, { dataConclusao: "2026-09-10" }),
        },
      ]),
    ).toEqual([
      {
        type: RealtimeEventType.ActivityStatusChanged,
        payload: { entityKind: "activity", entityId: "a1", projectId: "p1" },
      },
    ]);

    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.ActivityTask,
          entityId: "t1",
          action: AuditAction.created,
          activityId: "a1",
          changes,
        },
      ]),
    ).toEqual([
      {
        type: RealtimeEventType.ActivityChecklistChanged,
        payload: { entityKind: "task", entityId: "t1", activityId: "a1" },
      },
    ]);
  });

  it("maps project, catalog and value delivery", () => {
    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.Project,
          entityId: "p1",
          action: AuditAction.cancelled,
          projectId: "p1",
          changes,
        },
      ]),
    ).toEqual([
      {
        type: RealtimeEventType.ProjectChanged,
        payload: { entityKind: "project", entityId: "p1" },
      },
    ]);

    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.Area,
          entityId: "ar1",
          action: AuditAction.deactivated,
          changes,
        },
      ]),
    ).toEqual([
      {
        type: RealtimeEventType.CatalogChanged,
        payload: { entityKind: "area", entityId: "ar1" },
      },
    ]);

    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.Domain,
          entityId: "d1",
          action: AuditAction.created,
          changes,
        },
      ]),
    ).toEqual([
      {
        type: RealtimeEventType.CatalogChanged,
        payload: { entityKind: "domain", entityId: "d1" },
      },
    ]);

    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.ValueDelivery,
          entityId: "v1",
          action: AuditAction.field_changed,
          projectId: "p1",
          changes,
        },
      ]),
    ).toEqual([
      {
        type: RealtimeEventType.ValueDeliveryChanged,
        payload: { entityKind: "valueDelivery", entityId: "v1", projectId: "p1" },
      },
    ]);
  });

  it("skips User writes and dedupes identical drafts", () => {
    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.User,
          entityId: "u1",
          action: AuditAction.deactivated,
          changes,
        },
      ]),
    ).toEqual([]);

    expect(
      deriveRealtimeEvents([
        {
          entityKind: AuditEntityKind.ActivityTask,
          entityId: "t1",
          action: AuditAction.field_changed,
          activityId: "a1",
          changes,
        },
        {
          entityKind: AuditEntityKind.ActivityTask,
          entityId: "t1",
          action: AuditAction.field_changed,
          activityId: "a1",
          changes,
        },
      ]),
    ).toHaveLength(1);
  });
});
