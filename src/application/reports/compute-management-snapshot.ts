import type { LocalUser } from "@/domain/identity/local-user";
import type { Clock } from "@/application/ports/clock";
import { systemClock } from "@/application/ports/clock";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AuditRepository } from "@/application/ports/audit-repository";
import type {
  AreaRepository,
  CatalogUserRepository,
  DomainRepository,
} from "@/application/ports/catalog-repositories";
import type { ProjectRepository } from "@/application/ports/project-repository";
import {
  parsePortraitEvents,
  reconstructActivityPortrait,
  type PortraitSourceEvent,
} from "@/application/audit/reconstruct-portrait";
import type { ActivityListItem } from "@/application/activities/types";
import { filterByPeriod, resolveTemporalQuery } from "@/application/temporal";
import { aggregateManagementSnapshot } from "@/application/reports/aggregate";
import { matchesManagementFilters } from "@/application/reports/filters";
import type {
  ManagementLabelMaps,
  ManagementQuery,
  ManagementSnapshot,
} from "@/application/reports/types";

export type ManagementSnapshotDeps = {
  activities: ActivityRepository;
  audit: AuditRepository;
  users: CatalogUserRepository;
  areas: AreaRepository;
  domains: DomainRepository;
  projects: ProjectRepository;
  clock?: Clock;
};

function groupEventsByActivity(
  events: readonly { activityId: string | null; occurredAt: Date; sequence: bigint; changes: unknown }[],
): Map<string, PortraitSourceEvent[]> {
  const grouped = new Map<string, PortraitSourceEvent[]>();
  for (const event of events) {
    if (!event.activityId) {
      continue;
    }
    const parsed = parsePortraitEvents([event])[0];
    if (!parsed) {
      continue;
    }
    const list = grouped.get(event.activityId) ?? [];
    list.push(parsed);
    grouped.set(event.activityId, list);
  }
  return grouped;
}

function userLabel(user: { displayName: string | null; email: string | null }): string {
  return user.displayName ?? user.email ?? "Usuário sem identificação";
}

async function loadLabels(deps: ManagementSnapshotDeps): Promise<ManagementLabelMaps> {
  const [users, areas, domains, projects] = await Promise.all([
    deps.users.listAll(),
    deps.areas.list("all"),
    deps.domains.list("all"),
    deps.projects.list("all"),
  ]);

  return {
    users: new Map(users.map((user) => [user.id, userLabel(user)])),
    areas: new Map(areas.map((area) => [area.id, area.name])),
    domains: new Map(domains.map((domain) => [domain.id, domain.name])),
    projects: new Map(projects.map((project) => [project.id, project.name])),
  };
}

/**
 * Population P = T19 pertinence on **current** dates ∩ historical filters (DE-17).
 * Portrait at `fechamento_exclusivo` drives I-02…I-09 and D-* (DE-04, DE-05).
 */
export async function computeManagementSnapshot(
  _actor: LocalUser,
  query: ManagementQuery,
  deps: ManagementSnapshotDeps,
): Promise<ManagementSnapshot> {
  const clock = deps.clock ?? systemClock;
  const now = clock.now();
  const resolved = resolveTemporalQuery(query.temporal, now);

  const listed: ActivityListItem[] = await deps.activities.list({ includeCancelled: true });
  const inPeriod = filterByPeriod(listed, query.temporal, now);
  const candidateIds = [...new Set(inPeriod.map((item) => item.id))];

  const events =
    candidateIds.length === 0
      ? []
      : await deps.audit.listForActivities({
          activityIds: candidateIds,
          beforeOccurredAt: resolved.fechamentoExclusivo,
        });
  const eventsByActivity = groupEventsByActivity(events);

  const population = inPeriod
    .map((item) => {
      const portrait = reconstructActivityPortrait(
        eventsByActivity.get(item.id) ?? [],
        resolved.fechamentoExclusivo,
      );
      return { id: item.id, portrait };
    })
    .filter((row) => matchesManagementFilters(row.portrait, query.filters));

  const labels = await loadLabels(deps);
  return aggregateManagementSnapshot(population, labels, resolved.fechamentoExclusivo);
}
