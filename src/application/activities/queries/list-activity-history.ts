import type { LocalUser } from "@/domain/identity/local-user";
import { NotFoundError } from "@/domain/errors";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AreaRepository, CatalogUserRepository, DomainRepository } from "@/application/ports/catalog-repositories";
import type { AuditRepository } from "@/application/ports/audit-repository";
import type { ProjectRepository } from "@/application/ports/project-repository";
import {
  ACTIVITY_HISTORY_PAGE_SIZE,
  type ActivityHistoryItem,
  type ActivityHistoryPage,
} from "@/application/activities/activity-history-types";
import {
  collectHistoryReferenceIds,
  formatActivityHistoryEvent,
  type HistoryReferenceLabels,
} from "@/application/activities/format-activity-history";
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

export type ListActivityHistoryInput = {
  activityId: string;
  beforeSequence?: string | null;
  limit?: number;
};

export type ListActivityHistoryDeps = {
  activities: ActivityRepository;
  audit: AuditRepository;
  users: CatalogUserRepository;
  areas: AreaRepository;
  domains: DomainRepository;
  projects: ProjectRepository;
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
  deps: ListActivityHistoryDeps,
  ids: ReturnType<typeof collectHistoryReferenceIds>,
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

function toHistoryItem(
  event: {
    sequence: bigint;
    occurredAt: Date;
    actorUserId: string;
  },
  actorLabel: string,
  summary: string,
): ActivityHistoryItem {
  return {
    sequence: event.sequence.toString(),
    occurredAt: formatOccurredAt(event.occurredAt),
    actorLabel,
    summary,
  };
}

export async function listActivityHistory(
  _actor: LocalUser,
  input: ListActivityHistoryInput,
  deps: ListActivityHistoryDeps,
): Promise<ActivityHistoryPage> {
  const activity = await deps.activities.findById(input.activityId);
  if (!activity) {
    throw new NotFoundError("Atividade não encontrada.");
  }

  const limit = input.limit ?? ACTIVITY_HISTORY_PAGE_SIZE;
  const beforeSequence =
    input.beforeSequence != null && input.beforeSequence !== ""
      ? BigInt(input.beforeSequence)
      : null;

  const { events, hasMore } = await deps.audit.listForActivity({
    activityId: input.activityId,
    limit,
    beforeSequence,
  });

  const referenceIds = collectHistoryReferenceIds(events);
  const labels = await resolveReferenceLabels(deps, referenceIds);

  const items = events.map((event) => {
    const actorLabel = labels.users.get(event.actorUserId) ?? "Usuário sem identificação";
    const summary = formatActivityHistoryEvent(event, labels);
    return toHistoryItem(event, actorLabel, summary);
  });

  const oldestSequence = items.length > 0 ? items[0]!.sequence : null;

  return {
    items,
    hasMore,
    oldestSequence,
  };
}
