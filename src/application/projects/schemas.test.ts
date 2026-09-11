import { describe, expect, it } from "vitest";
import { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import { ProjectStatus } from "@/domain/project/project-status";
import { createProjectSchema, updateProjectSchema } from "@/application/projects/schemas";

const areaId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";

function requiredFields(overrides: Record<string, unknown> = {}) {
  return {
    name: "Implantação ERP",
    responsibleAreaId: areaId,
    architectureOwnerId: ownerId,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    nature: Nature.STRATEGIC,
    status: ProjectStatus.PLANNED,
    ...overrides,
  };
}

describe("project schemas", () => {
  it("accepts required fields and empty optionals", () => {
    const parsed = createProjectSchema.safeParse(requiredFields());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.description).toBeNull();
      expect(parsed.data.participantIds).toEqual([]);
      expect(parsed.data.startDate).toBeNull();
    }
  });

  it("rejects a blank name", () => {
    const parsed = createProjectSchema.safeParse(requiredFields({ name: "   " }));
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid civil dates", () => {
    const parsed = createProjectSchema.safeParse(requiredFields({ startDate: "2026-02-31" }));
    expect(parsed.success).toBe(false);
  });

  it("rejects expected end before start", () => {
    const parsed = createProjectSchema.safeParse(
      requiredFields({ startDate: "2026-09-10", expectedEndDate: "2026-09-01" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("does not allow CANCELLED on update (use cancel command)", () => {
    const parsed = updateProjectSchema.safeParse({
      ...requiredFields({ status: ProjectStatus.CANCELLED }),
      id: areaId,
      version: 1,
    });
    expect(parsed.success).toBe(false);
  });
});
