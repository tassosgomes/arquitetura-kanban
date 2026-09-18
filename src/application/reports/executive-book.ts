import type { LocalUser } from "@/domain/identity/local-user";
import { ActivityStatus, ACTIVITY_STATUS_LABELS } from "@/domain/activity/enums";
import {
  ACTIVITY_NATURE_LABELS,
  Nature,
  type Nature as NatureValue,
} from "@/domain/catalog/classifications";
import type { ValueDeliveryListItem } from "@/application/value-deliveries/types";
import type { ValueDeliveryRepository } from "@/application/ports/value-delivery-repository";
import type { ProjectListItem } from "@/application/projects/types";
import { todayInAppTimeZone, resolveTemporalQuery, TemporalQueryMode } from "@/application/temporal";
import {
  asPortraitId,
} from "@/application/audit/reconstruct-portrait";
import {
  classifyDeadlineStatus,
  DeadlineStatus,
  DEADLINE_STATUS_LABELS,
} from "@/application/reports/deadline-status";
import {
  aggregateManagementSnapshot,
  type ManagementPopulationRow,
} from "@/application/reports/aggregate";
import {
  loadManagementPopulation,
  type ManagementSnapshotDeps,
} from "@/application/reports/compute-management-snapshot";
import {
  toManagementReportRow,
  type ManagementReportRow,
} from "@/application/reports/report-rows";
import type {
  ManagementLabelMaps,
  ManagementQuery,
  ManagementSnapshot,
} from "@/application/reports/types";
import type { Instant } from "@/application/temporal";
import { systemClock } from "@/application/ports/clock";

export type ExecutiveBookDeps = ManagementSnapshotDeps & {
  valueDeliveries: ValueDeliveryRepository;
};

export type ExecutiveBookActivity = ManagementReportRow & {
  description: string | null;
  requestingAreaId: string | null;
  checklistDoneCount: number;
  checklistTotalCount: number;
  deadlineStatus: DeadlineStatus;
  deadlineStatusLabel: string;
};

export type ExecutiveBookStatusSummary = {
  status: ActivityStatus;
  label: string;
  count: number;
  percentage: number;
};

export type ExecutiveBookDeadlineSummary = {
  byStatus: Array<{
    status: DeadlineStatus;
    label: string;
    count: number;
  }>;
  eligible: number;
  onTime: number;
  percentage: number | null;
};

export type ExecutiveBookArea = {
  id: string | null;
  name: string;
  activities: ExecutiveBookActivity[];
  snapshot: ManagementSnapshot;
  totalProjects: number;
  statusSummary: ExecutiveBookStatusSummary[];
  deadlineSummary: ExecutiveBookDeadlineSummary;
  natureSummary: Array<{ key: NatureValue; label: string; count: number; percentage: number }>;
  deliveries: ValueDeliveryListItem[];
};

export type ExecutiveBookNatureSummary = Array<{
  key: NatureValue;
  label: string;
  count: number;
  percentage: number;
}>;

/** One row of the "Áreas em um olhar" table on the consolidated view. */
export type ExecutiveBookAreaOverview = {
  id: string | null;
  name: string;
  activityCount: number;
  totalProjects: number;
  inProgress: number;
  done: number;
  overdue: number;
  onTime: number;
  eligible: number;
  onTimePercentage: number | null;
};

/** Numbers for the whole slice (every area together), not a sum of pages. */
export type ExecutiveBookConsolidated = {
  totalActivities: number;
  totalAreas: number;
  totalProjects: number;
  done: number;
  donePercentage: number;
  blocked: number;
  overdue: number;
  onTime: number;
  eligible: number;
  onTimePercentage: number | null;
  deliveriesCount: number;
  statusSummary: ExecutiveBookStatusSummary[];
  deadlineSummary: ExecutiveBookDeadlineSummary;
  natureSummary: ExecutiveBookNatureSummary;
  areas: ExecutiveBookAreaOverview[];
};

export type ExecutiveBook = {
  dataBase: string;
  fechamento: Instant;
  geral: ManagementSnapshot;
  consolidated: ExecutiveBookConsolidated;
  areas: ExecutiveBookArea[];
};

const STATUS_ORDER = Object.values(ActivityStatus);
const DEADLINE_ORDER = Object.keys(DEADLINE_STATUS_LABELS) as DeadlineStatus[];

function areaName(
  id: string | null,
  labels: ReadonlyMap<string, string>,
): string {
  if (!id) {
    return "Sem área identificada";
  }
  return labels.get(id) ?? "Área sem identificação";
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function isReferenceDateInQuery(
  referenceDate: string,
  query: ManagementQuery,
  now: Instant,
): boolean {
  if (query.temporal.mode !== TemporalQueryMode.PERIOD) {
    return true;
  }

  const resolved = resolveTemporalQuery(query.temporal, now);
  return resolved.mode === TemporalQueryMode.PERIOD
    ? referenceDate >= resolved.start && referenceDate <= resolved.end
    : true;
}

function pageProjectIds(projects: readonly ProjectListItem[], areaId: string | null): Set<string> {
  return new Set(
    projects
      .filter((project) => project.responsibleArea.id === areaId)
      .map((project) => project.id),
  );
}

function statusSummary(activities: readonly ExecutiveBookActivity[]): ExecutiveBookStatusSummary[] {
  const total = activities.length;
  const counts = new Map<ActivityStatus, number>();
  for (const activity of activities) {
    if (activity.statusKey) {
      counts.set(activity.statusKey, (counts.get(activity.statusKey) ?? 0) + 1);
    }
  }
  return STATUS_ORDER.map((status) => ({
    status,
    label: ACTIVITY_STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
    percentage: percentage(counts.get(status) ?? 0, total),
  }));
}

function deadlineSummary(activities: readonly ExecutiveBookActivity[]): ExecutiveBookDeadlineSummary {
  const counts = new Map<DeadlineStatus, number>();
  for (const activity of activities) {
    counts.set(activity.deadlineStatus, (counts.get(activity.deadlineStatus) ?? 0) + 1);
  }
  const onTime = (counts.get("ON_TIME") ?? 0);
  const overdue = (counts.get("OVERDUE") ?? 0) + (counts.get("COMPLETED_LATE") ?? 0);
  const eligible = onTime + overdue;
  return {
    byStatus: DEADLINE_ORDER.map((status) => ({
      status,
      label: DEADLINE_STATUS_LABELS[status],
      count: counts.get(status) ?? 0,
    })),
    eligible,
    onTime,
    percentage: eligible === 0 ? null : Math.round((onTime / eligible) * 100),
  };
}

function natureSummary(activities: readonly ExecutiveBookActivity[]) {
  const total = activities.length;
  const counts = new Map<NatureValue, number>();
  for (const activity of activities) {
    if (activity.nature === ACTIVITY_NATURE_LABELS[Nature.STRATEGIC]) {
      counts.set(Nature.STRATEGIC, (counts.get(Nature.STRATEGIC) ?? 0) + 1);
    } else if (activity.nature === ACTIVITY_NATURE_LABELS[Nature.OPERATIONAL]) {
      counts.set(Nature.OPERATIONAL, (counts.get(Nature.OPERATIONAL) ?? 0) + 1);
    }
  }
  return [Nature.STRATEGIC, Nature.OPERATIONAL].map((key) => ({
    key,
    label: ACTIVITY_NATURE_LABELS[key],
    count: counts.get(key) ?? 0,
    percentage: percentage(counts.get(key) ?? 0, total),
  }));
}

function countStatus(
  summary: readonly ExecutiveBookStatusSummary[],
  status: ActivityStatus,
): number {
  return summary.find((item) => item.status === status)?.count ?? 0;
}

function countDeadline(
  summary: ExecutiveBookDeadlineSummary,
  status: DeadlineStatus,
): number {
  return summary.byStatus.find((item) => item.status === status)?.count ?? 0;
}

function toAreaOverview(area: ExecutiveBookArea): ExecutiveBookAreaOverview {
  return {
    id: area.id,
    name: area.name,
    activityCount: area.activities.length,
    totalProjects: area.totalProjects,
    inProgress: countStatus(area.statusSummary, ActivityStatus.IN_PROGRESS),
    done: countStatus(area.statusSummary, ActivityStatus.DONE),
    overdue: countDeadline(area.deadlineSummary, DeadlineStatus.OVERDUE),
    onTime: area.deadlineSummary.onTime,
    eligible: area.deadlineSummary.eligible,
    onTimePercentage: area.deadlineSummary.percentage,
  };
}

/**
 * Consolidates every area of the slice. Projects and value deliveries are
 * de-duplicated by id because the same one can show up on more than one area
 * page, so a naive sum would over-count them.
 */
function consolidate(
  entries: ReadonlyArray<{ area: ExecutiveBookArea; projectIds: ReadonlySet<string> }>,
): ExecutiveBookConsolidated {
  const activities = entries.flatMap((entry) => entry.area.activities);
  const status = statusSummary(activities);
  const deadline = deadlineSummary(activities);
  const projectIds = new Set<string>();
  const deliveryIds = new Set<string>();
  for (const entry of entries) {
    for (const projectId of entry.projectIds) {
      projectIds.add(projectId);
    }
    for (const delivery of entry.area.deliveries) {
      deliveryIds.add(delivery.id);
    }
  }
  const done = countStatus(status, ActivityStatus.DONE);

  return {
    totalActivities: activities.length,
    totalAreas: entries.length,
    totalProjects: projectIds.size,
    done,
    donePercentage: percentage(done, activities.length),
    blocked: countStatus(status, ActivityStatus.BLOCKED),
    overdue: countDeadline(deadline, DeadlineStatus.OVERDUE),
    onTime: deadline.onTime,
    eligible: deadline.eligible,
    onTimePercentage: deadline.percentage,
    deliveriesCount: deliveryIds.size,
    statusSummary: status,
    deadlineSummary: deadline,
    natureSummary: natureSummary(activities),
    areas: entries.map((entry) => toAreaOverview(entry.area)),
  };
}

function toBookActivity(
  row: ManagementPopulationRow,
  listed: {
    title: string;
    description: string | null;
    checklistDoneCount: number;
    checklistTotalCount: number;
  },
  labels: ManagementLabelMaps,
  dataBase: string,
): ExecutiveBookActivity {
  const reportRow = toManagementReportRow({
    id: row.id,
    title: listed.title,
    portrait: row.portrait,
    labels,
  });
  const deadlineStatus = classifyDeadlineStatus({
    status: reportRow.statusKey ?? ActivityStatus.BACKLOG,
    expectedEndDate: reportRow.forecastDate || null,
    completedDate: reportRow.completedDate || null,
    today: dataBase,
  });
  return {
    ...reportRow,
    description: listed.description ?? null,
    requestingAreaId: asPortraitId(row.portrait.areaSolicitanteId),
    checklistDoneCount: listed.checklistDoneCount,
    checklistTotalCount: listed.checklistTotalCount,
    deadlineStatus,
    deadlineStatusLabel: DEADLINE_STATUS_LABELS[deadlineStatus],
  };
}

export async function buildExecutiveBook(
  actor: LocalUser,
  query: ManagementQuery,
  deps: ExecutiveBookDeps,
): Promise<ExecutiveBook> {
  const loaded = await loadManagementPopulation(actor, query, deps);
  const now = (deps.clock ?? systemClock).now();
  const resolved = resolveTemporalQuery(query.temporal, now);
  const dataBase =
    resolved.mode === TemporalQueryMode.PERIOD
      ? resolved.end
      : todayInAppTimeZone(now);
  const geral = aggregateManagementSnapshot(loaded.population, loaded.labels, loaded.fechamento);
  const projects = await deps.projects.list("all");
  const projectIds = new Set(projects.map((project) => project.id));
  const deliveries = await deps.valueDeliveries.listByProjectIds([...projectIds]);
  const deliveriesByProject = new Map<string, ValueDeliveryListItem[]>();
  for (const delivery of deliveries) {
    if (!isReferenceDateInQuery(delivery.referenceDate, query, now)) {
      continue;
    }
    const list = deliveriesByProject.get(delivery.projectId) ?? [];
    list.push(delivery);
    deliveriesByProject.set(delivery.projectId, list);
  }

  const activitiesByArea = new Map<string | null, ExecutiveBookActivity[]>();
  for (const row of loaded.population) {
    const listed = loaded.listedById.get(row.id);
    if (!listed) {
      continue;
    }
    const areaId = asPortraitId(row.portrait.areaSolicitanteId);
    const activities = activitiesByArea.get(areaId) ?? [];
    activities.push(toBookActivity(row, listed, loaded.labels, dataBase));
    activitiesByArea.set(areaId, activities);
  }

  const areaEntries = [...activitiesByArea.entries()]
    .map(([id, activities]) => {
      // TODO: `pageProjectIds` filters projects by RESPONSIBLE area while the
      // pages group activities by REQUESTING area. Kept as-is on purpose so the
      // consolidated view matches the current per-area numbers; fix separately.
      const responsibleProjectIds = pageProjectIds(projects, id);
      const pageDeliveries = [...responsibleProjectIds]
        .flatMap((projectId) => deliveriesByProject.get(projectId) ?? [])
        .sort((left, right) => right.referenceDate.localeCompare(left.referenceDate));
      const pageRows = loaded.population.filter(
        (row) => asPortraitId(row.portrait.areaSolicitanteId) === id,
      );
      const snapshot = aggregateManagementSnapshot(pageRows, loaded.labels, loaded.fechamento);
      return {
        projectIds: responsibleProjectIds,
        area: {
          id,
          name: areaName(id, loaded.labels.areas),
          activities,
          snapshot,
          totalProjects: responsibleProjectIds.size,
          statusSummary: statusSummary(activities),
          deadlineSummary: deadlineSummary(activities),
          natureSummary: natureSummary(activities),
          deliveries: pageDeliveries,
        } satisfies ExecutiveBookArea,
      };
    })
    .sort((left, right) => {
      if (left.area.id === null) return 1;
      if (right.area.id === null) return -1;
      return left.area.name.localeCompare(right.area.name, "pt-BR");
    });

  const areas = areaEntries.map((entry) => entry.area);

  return {
    dataBase,
    fechamento: loaded.fechamento,
    geral,
    consolidated: consolidate(areaEntries),
    areas,
  };
}
