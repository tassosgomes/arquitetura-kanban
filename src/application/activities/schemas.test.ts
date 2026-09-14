import { describe, expect, it } from "vitest";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { applyProjectInheritance } from "@/application/activities/apply-inheritance";
import {
  addActivityTaskSchema,
  changeActivityStatusSchema,
  createActivitySchema,
  reorderActivityTasksSchema,
  updateActivitySchema,
} from "@/application/activities/schemas";

const areaId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const domainId = "33333333-3333-4333-8333-333333333333";
const projectId = "44444444-4444-4444-8444-444444444444";

function requiredFields(overrides: Record<string, unknown> = {}) {
  return {
    title: "Revisar integrações",
    domainId,
    priority: Priority.MEDIUM,
    status: ActivityStatus.BACKLOG,
    type: ActivityType.AD_HOC,
    ownerId,
    requestingAreaId: areaId,
    nature: Nature.STRATEGIC,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    ...overrides,
  };
}

describe("activity schemas", () => {
  it("accepts an ad hoc activity with required fields", () => {
    const parsed = createActivitySchema.safeParse(requiredFields());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.projectId).toBeNull();
      expect(parsed.data.effort).toBeNull();
      expect(parsed.data.involvedAreaIds).toEqual([]);
    }
  });

  it("rejects tipo Projeto without projectId", () => {
    const parsed = createActivitySchema.safeParse(
      requiredFields({ type: ActivityType.PROJECT, projectId: "" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects ad hoc with a projectId", () => {
    const parsed = createActivitySchema.safeParse(
      requiredFields({ type: ActivityType.AD_HOC, projectId }),
    );
    expect(parsed.success).toBe(false);
  });

  it("accepts tipo Projeto with projectId", () => {
    const parsed = createActivitySchema.safeParse(
      requiredFields({ type: ActivityType.PROJECT, projectId }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects CANCELLED on create and update", () => {
    expect(
      createActivitySchema.safeParse(requiredFields({ status: ActivityStatus.CANCELLED })).success,
    ).toBe(false);
    expect(
      updateActivitySchema.safeParse({
        ...requiredFields({ status: ActivityStatus.CANCELLED }),
        id: areaId,
        version: 1,
      }).success,
    ).toBe(false);
  });

  it("rejects expected end before start", () => {
    const parsed = createActivitySchema.safeParse(
      requiredFields({ startDate: "2026-09-10", expectedEndDate: "2026-09-01" }),
    );
    expect(parsed.success).toBe(false);
  });
});

describe("changeActivityStatusSchema", () => {
  it("accepts a board destination and Cancelled", () => {
    expect(
      changeActivityStatusSchema.safeParse({
        id: areaId,
        version: 2,
        status: ActivityStatus.IN_PROGRESS,
      }).success,
    ).toBe(true);
    expect(
      changeActivityStatusSchema.safeParse({
        id: areaId,
        version: 2,
        status: ActivityStatus.CANCELLED,
      }).success,
    ).toBe(true);
  });

  it("accepts omitted status for explicit reopen", () => {
    const parsed = changeActivityStatusSchema.safeParse({ id: areaId, version: 1 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBeUndefined();
    }
  });
});

describe("applyProjectInheritance", () => {
  const defaults = {
    projectId,
    participantIds: ["55555555-5555-4555-8555-555555555555"],
    nature: Nature.OPERATIONAL,
    architectureRole: ArchitectureRole.CONTRIBUTOR,
    requestingAreaId: areaId,
  };

  it("fills empty inherited fields from the project", () => {
    const result = applyProjectInheritance(
      { type: ActivityType.PROJECT },
      defaults,
    );
    expect(result.ownerId).toBeUndefined();
    expect(result.participantIds).toEqual(defaults.participantIds);
    expect(result.nature).toBe(Nature.OPERATIONAL);
    expect(result.architectureRole).toBe(ArchitectureRole.CONTRIBUTOR);
    expect(result.requestingAreaId).toBe(areaId);
  });

  it("keeps explicit overrides", () => {
    const otherOwner = "66666666-6666-4666-8666-666666666666";
    const result = applyProjectInheritance(
      {
        type: ActivityType.PROJECT,
        ownerId: otherOwner,
        participantIds: [],
        nature: Nature.STRATEGIC,
        architectureRole: ArchitectureRole.RESPONSIBLE,
        requestingAreaId: "77777777-7777-4777-8777-777777777777",
      },
      defaults,
    );
    expect(result.ownerId).toBe(otherOwner);
    expect(result.participantIds).toEqual([]);
    expect(result.nature).toBe(Nature.STRATEGIC);
    expect(result.architectureRole).toBe(ArchitectureRole.RESPONSIBLE);
    expect(result.requestingAreaId).not.toBe(areaId);
  });

  it("does not inherit for ad hoc", () => {
    const result = applyProjectInheritance({ type: ActivityType.AD_HOC }, defaults);
    expect(result.ownerId).toBeUndefined();
    expect(result.participantIds).toEqual([]);
    expect(result.nature).toBeUndefined();
    expect(result.requestingAreaId).toBeUndefined();
  });
});

describe("activity checklist schemas", () => {
  it("rejects an empty task description", () => {
    const parsed = addActivityTaskSchema.safeParse({
      activityId: areaId,
      version: 1,
      description: "   ",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an empty ordered list (zero tasks)", () => {
    const parsed = reorderActivityTasksSchema.safeParse({
      activityId: areaId,
      version: 1,
      orderedTaskIds: [],
    });
    expect(parsed.success).toBe(true);
  });
});
