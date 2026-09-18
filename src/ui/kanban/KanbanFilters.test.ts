import { describe, expect, it } from "vitest";
import { ActivityStatus } from "@/domain/activity/enums";
import { Priority } from "@/domain/catalog/classifications";
import { KanbanPeriodOption, type KanbanFilterValues } from "@/application/activities/kanban-filters";
import { buildActiveFilterChips } from "@/ui/kanban/KanbanFilters";

const AREA_ID = "11111111-1111-4111-8111-111111111111";

const options = {
  areas: [{ id: AREA_ID, label: "Arrecadação" }],
  projects: [],
  users: [],
  domains: [],
};

function values(overrides: Partial<KanbanFilterValues> = {}): KanbanFilterValues {
  return {
    period: KanbanPeriodOption.ALL,
    from: "",
    to: "",
    includeCancelled: false,
    mine: false,
    ...overrides,
  };
}

describe("KanbanFilters chips (KUX-04)", () => {
  it("describes active dimensions and shortcuts with readable labels", () => {
    const chips = buildActiveFilterChips(
      values({
        period: KanbanPeriodOption.THIS_WEEK,
        areaId: AREA_ID,
        priority: Priority.HIGH,
        mine: true,
      }),
      options,
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      "Período: Esta semana",
      "Área: Arrecadação",
      "Prioridade: Alta",
      "Somente minhas",
    ]);
  });

  it("groups custom dates into one removable filter", () => {
    const period = buildActiveFilterChips(
      values({
        period: KanbanPeriodOption.CUSTOM,
        from: "2026-08-01",
        to: "2026-08-31",
        status: ActivityStatus.BLOCKED,
      }),
      options,
    ).find((chip) => chip.id === "period");

    expect(period).toMatchObject({
      label: "Período: 01/08/2026 a 31/08/2026",
      removeKeys: ["period", "from", "to"],
    });
  });
});
