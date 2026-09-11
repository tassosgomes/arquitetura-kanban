import type { LocalUser } from "@/domain/identity/local-user";
import { NotFoundError } from "@/domain/errors";
import { AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AreaRepository, CatalogUserRepository, DomainRepository } from "@/application/ports/catalog-repositories";
import type { AuditRepository } from "@/application/ports/audit-repository";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ValueDeliveryRepository } from "@/application/ports/value-delivery-repository";
import {
  PROJECT_HISTORY_PAGE_SIZE,
  type ProjectHistoryItem,
  type ProjectHistoryPage,
} from "@/application/projects/project-history-types";
import {
  collectProjectHistoryReferenceIds,
  formatProjectHistoryEvent,
  resolveProjectHistorySource,
} from "@/application/projects/format-project-history";
import type { HistoryReferenceLabels } from "@/application/activities/format-activity-history";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";

function formatUserLabel(user: {
  displayName: string | null;
  email: string | null;
}): string {
  if (user.displayName && user.email) {
    return `${user.displayName} (${user.email})`;
  }
  return user.displayName ?? user.email ?? "Usuário sem identificação";
}

export type ListProjectHistoryInput = {
  projectId: string;
  beforeSequence?: string | null;
  limit?: number;
};

export type ListProjectHistoryDeps = {
  projects: ProjectRepository;
  activities: ActivityRepository;
  valueDeliveries: ValueDeliveryRepository;
  audit: AuditRepository;
  users: CatalogUserRepository;
  areas: AreaRepository;
  domains: DomainRepository;
};

function formatOccurredAt(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(value);
}

function inactiveSuffix(isActive: boolean): string {
  return isActive ? "" : " (inativo)";
}

async function resolveReferenceLabels(
  deps: ListProjectHistoryDeps,
  ids: ReturnType<typeof collectProjectHistoryReferenceIds>,
): Promise<HistoryReferenceLabels> {
  const [users, areas, domains, projects] = await Promise.all([
    deps.users.findByIds([...ids.userIds]),
    Promise.all([...ids.areaIds].map((id) => deps.areas.findById(id))).then((rows) =>
      rows.filter((row): row is NonNullable<typeof row> => row != null),
    ),
    Promise.all([...ids.domainIds].map((id) => deps.domains.findById(id))).then((rows) =>
      rows.filter((row): row is NonNullable<typeof row> => row != null),
    ),
    Promise.all([...ids.projectIds].map((id) => deps.projects.findById(id))).then((rows) =>
      rows.filter((row): row is NonNullable<typeof row> => row != null),
    ),
  ]);

  return {
    users: new Map(
      users.map((user) => [
        user.id,
        `${formatUserLabel(user)}${inactiveSuffix(user.isActive)}`,
      ]),
    ),
    areas: new Map(
      areas.map((area) => [area.id, `${area.name}${inactiveSuffix(area.isActive)}`]),
    ),
    domains: new Map(
      domains.map((domain) => [domain.id, `${domain.name}${inactiveSuffix(domain.isActive)}`]),
    ),
    projects: new Map(
      projects.map((project) => [
        project.id,
        `${project.name}${project.status === "CANCELLED" ? " (cancelado)" : ""}`,
      ]),
    ),
  };
}

async function resolveEntityTitles(
  deps: ListProjectHistoryDeps,
  events: readonly { entityKind: string; entityId: string; activityId: string | null }[],
): Promise<{
  activityTitles: Map<string, string>;
  deliveryTitles: Map<string, string>;
}> {
  const activityIds = new Set<string>();
  const deliveryIds = new Set<string>();

  for (const event of events) {
    if (event.entityKind === AuditEntityKind.Activity) {
      activityIds.add(event.entityId);
    }
    if (event.entityKind === AuditEntityKind.ActivityTask && event.activityId) {
      activityIds.add(event.activityId);
    }
    if (event.entityKind === AuditEntityKind.ValueDelivery) {
      deliveryIds.add(event.entityId);
    }
  }

  const [activities, deliveries] = await Promise.all([
    Promise.all([...activityIds].map((id) => deps.activities.findById(id))).then((rows) =>
      rows.filter((row): row is NonNullable<typeof row> => row != null),
    ),
    Promise.all([...deliveryIds].map((id) => deps.valueDeliveries.findById(id))).then((rows) =>
      rows.filter((row): row is NonNullable<typeof row> => row != null),
    ),
  ]);

  return {
    activityTitles: new Map(activities.map((activity) => [activity.id, activity.title])),
    deliveryTitles: new Map(deliveries.map((delivery) => [delivery.id, delivery.title])),
  };
}

export async function listProjectHistory(
  _actor: LocalUser,
  input: ListProjectHistoryInput,
  deps: ListProjectHistoryDeps,
): Promise<ProjectHistoryPage> {
  const project = await deps.projects.findById(input.projectId);
  if (!project) {
    throw new NotFoundError("Projeto não encontrado.");
  }

  const limit = input.limit ?? PROJECT_HISTORY_PAGE_SIZE;
  const beforeSequence =
    input.beforeSequence != null && input.beforeSequence !== ""
      ? BigInt(input.beforeSequence)
      : null;

  const { events, hasMore } = await deps.audit.listForProject({
    projectId: input.projectId,
    limit,
    beforeSequence,
  });

  const referenceIds = collectProjectHistoryReferenceIds(events);
  const [labels, titles] = await Promise.all([
    resolveReferenceLabels(deps, referenceIds),
    resolveEntityTitles(deps, events),
  ]);

  const context = {
    projectId: project.id,
    projectName: project.name,
    activityTitles: titles.activityTitles,
    deliveryTitles: titles.deliveryTitles,
  };

  const items: ProjectHistoryItem[] = events.map((event) => {
    const actorLabel = labels.users.get(event.actorUserId) ?? "Usuário sem identificação";
    const summary = formatProjectHistoryEvent(event, labels);
    const source = resolveProjectHistorySource(event, context);

    return {
      sequence: event.sequence.toString(),
      occurredAt: formatOccurredAt(event.occurredAt),
      actorLabel,
      summary,
      sourceKind: source.sourceKind,
      sourceLabel: source.sourceLabel,
      sourceHref: source.sourceHref,
    };
  });

  const oldestSequence = items.length > 0 ? items[0]!.sequence : null;

  return {
    items,
    hasMore,
    oldestSequence,
  };
}
