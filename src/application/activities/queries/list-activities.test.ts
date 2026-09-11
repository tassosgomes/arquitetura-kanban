import { describe, expect, it, vi } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Priority } from "@/domain/catalog/classifications";
import type { LocalUser } from "@/domain/identity/local-user";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { ActivityListItem } from "@/application/activities/types";
import { listActivities } from "@/application/activities/queries/list-activities";
import { TemporalQueryMode } from "@/application/temporal";

const actor: LocalUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  oidcIssuer: "https://t20.test",
  oidcSubject: "actor",
  isActive: true,
};

const clock = { now: () => new Date("2026-09-20T12:00:00-03:00") };

function listItem(
  overrides: Partial<ActivityListItem> & Pick<ActivityListItem, "id" | "title" | "status">,
): ActivityListItem {
  return {
    type: ActivityType.AD_HOC,
    priority: Priority.MEDIUM,
    effort: null,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    startDate: null,
    expectedEndDate: null,
    completedDate: null,
    cancelledDate: null,
    checklistDoneCount: 0,
    checklistTotalCount: 0,
    project: null,
    requestingArea: { id: "area", name: "Financeiro", isActive: true },
    owner: { id: "owner", displayName: "Ana", email: null, isActive: true },
    updatedAt: new Date("2026-09-10T12:00:00.000Z"),
    version: 1,
    ...overrides,
  };
}

function repoWith(items: ActivityListItem[]): ActivityRepository {
  return {
    list: vi.fn(async () => items),
  } as unknown as ActivityRepository;
}

describe("listActivities temporal cut (T20 / DE-24)", () => {
  const agoSet = listItem({
    id: "ago-set",
    title: "Ago–set",
    status: ActivityStatus.DONE,
    startDate: "2026-08-25",
    completedDate: "2026-09-18",
  });
  const septemberOnly = listItem({
    id: "set",
    title: "Setembro",
    status: ActivityStatus.IN_PROGRESS,
    startDate: "2026-09-01",
  });
  const unplanned = listItem({
    id: "unplanned",
    title: "Sem início",
    status: ActivityStatus.TODO,
    startDate: null,
  });

  it("keeps current status when filtering by a past month", async () => {
    const activities = repoWith([agoSet, septemberOnly, unplanned]);
    const listed = await listActivities(
      actor,
      {
        temporal: {
          mode: TemporalQueryMode.PERIOD,
          period: { from: "2026-08-01", to: "2026-08-31" },
        },
      },
      activities,
      clock,
    );

    expect(listed.map((item) => item.id)).toEqual(["ago-set"]);
    expect(listed[0]?.status).toBe(ActivityStatus.DONE);
  });

  it("returns Sem planejamento independently of a period range", async () => {
    const activities = repoWith([agoSet, unplanned]);
    const listed = await listActivities(
      actor,
      { temporal: { mode: TemporalQueryMode.UNPLANNED } },
      activities,
      clock,
    );
    expect(listed.map((item) => item.id)).toEqual(["unplanned"]);
  });

  it("Todas keeps planned and unplanned items", async () => {
    const activities = repoWith([agoSet, unplanned]);
    const listed = await listActivities(
      actor,
      { temporal: { mode: TemporalQueryMode.ALL } },
      activities,
      clock,
    );
    expect(listed.map((item) => item.id)).toEqual(["ago-set", "unplanned"]);
  });
});
