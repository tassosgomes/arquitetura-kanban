import { describe, expect, it } from "vitest";
import { ARCHITECTURE_DOMAIN_NAMES } from "@/domain/catalog/architecture-domains";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import { isActivityProjectLinkValid } from "@/domain/activity/activity-project-link";
import { ActivityType, ACTIVITY_STATUS_LABELS, KANBAN_COLUMN_STATUSES } from "@/domain/activity/enums";
import { isActiveProjectStatus, ProjectStatus } from "@/domain/project/project-status";

describe("catalog and activity invariants (unit)", () => {
  it("lists the six PRD architecture domains with distinct normalized keys", () => {
    expect(ARCHITECTURE_DOMAIN_NAMES).toHaveLength(6);
    const keys = ARCHITECTURE_DOMAIN_NAMES.map(normalizeCatalogName);
    expect(new Set(keys).size).toBe(6);
    expect(ARCHITECTURE_DOMAIN_NAMES).toContain("Arquitetura");
    expect(ARCHITECTURE_DOMAIN_NAMES).toContain("IA e Automação");
  });

  it("requires projectId only for PROJECT activities", () => {
    expect(isActivityProjectLinkValid(ActivityType.PROJECT, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(true);
    expect(isActivityProjectLinkValid(ActivityType.PROJECT, null)).toBe(false);
    expect(isActivityProjectLinkValid(ActivityType.AD_HOC, null)).toBe(true);
    expect(isActivityProjectLinkValid(ActivityType.AD_HOC, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(false);
  });

  it("maps Kanban domain names and excludes Cancelled from default columns", () => {
    expect(ACTIVITY_STATUS_LABELS.TODO).toBe("A fazer");
    expect(ACTIVITY_STATUS_LABELS.WAITING).toBe("Aguardando retorno");
    expect(ACTIVITY_STATUS_LABELS.DONE).toBe("Concluído");
    expect(KANBAN_COLUMN_STATUSES).toHaveLength(6);
    expect(KANBAN_COLUMN_STATUSES).not.toContain("CANCELLED");
  });

  it("treats cancelled projects as inactive for DE-14 uniqueness", () => {
    expect(isActiveProjectStatus(ProjectStatus.PLANNED)).toBe(true);
    expect(isActiveProjectStatus(ProjectStatus.CANCELLED)).toBe(false);
  });
});
