import { z } from "zod";
import { ActivityStatus } from "@/domain/activity/enums";
import {
  ArchitectureRole,
  Effort,
  Nature,
  Priority,
} from "@/domain/catalog/classifications";
import { isCivilDateString } from "@/domain/calendar/civil-date";
import type { ActivityListFilter, ActivityListItem } from "@/application/activities/types";
import { EFFORT_FILTER_UNSET, type EffortListFilter } from "@/application/activities/types";
import {
  PeriodPreset,
  TemporalQueryMode,
  type TemporalQuery,
} from "@/application/temporal";

export const KanbanPeriodOption = {
  ALL: "ALL",
  UNPLANNED: "UNPLANNED",
  THIS_WEEK: PeriodPreset.THIS_WEEK,
  LAST_WEEK: PeriodPreset.LAST_WEEK,
  THIS_MONTH: PeriodPreset.THIS_MONTH,
  LAST_MONTH: PeriodPreset.LAST_MONTH,
  THIS_QUARTER: PeriodPreset.THIS_QUARTER,
  THIS_YEAR: PeriodPreset.THIS_YEAR,
  CUSTOM: "CUSTOM",
} as const;

export type KanbanPeriodOption = (typeof KanbanPeriodOption)[keyof typeof KanbanPeriodOption];

export const KANBAN_PERIOD_OPTIONS: readonly KanbanPeriodOption[] = [
  KanbanPeriodOption.ALL,
  KanbanPeriodOption.UNPLANNED,
  KanbanPeriodOption.THIS_WEEK,
  KanbanPeriodOption.LAST_WEEK,
  KanbanPeriodOption.THIS_MONTH,
  KanbanPeriodOption.LAST_MONTH,
  KanbanPeriodOption.THIS_QUARTER,
  KanbanPeriodOption.THIS_YEAR,
  KanbanPeriodOption.CUSTOM,
];

export const KANBAN_PERIOD_LABELS: Record<KanbanPeriodOption, string> = {
  ALL: "Todas",
  UNPLANNED: "Sem planejamento",
  THIS_WEEK: "Esta semana",
  LAST_WEEK: "Semana passada",
  THIS_MONTH: "Este mês",
  LAST_MONTH: "Mês passado",
  THIS_QUARTER: "Este trimestre",
  THIS_YEAR: "Este ano",
  CUSTOM: "Personalizado",
};

export const KanbanShortcut = {
  ALL: "ALL",
  MY_WEEK: "MY_WEEK",
  THIS_MONTH: "THIS_MONTH",
  BLOCKED: "BLOCKED",
} as const;

export type KanbanShortcut = (typeof KanbanShortcut)[keyof typeof KanbanShortcut];

export const KANBAN_SHORTCUTS: readonly { id: KanbanShortcut; label: string; href: string }[] = [
  { id: KanbanShortcut.ALL, label: "Todas", href: "/kanban" },
  { id: KanbanShortcut.MY_WEEK, label: "Minha semana", href: "/kanban?period=THIS_WEEK&mine=1" },
  { id: KanbanShortcut.THIS_MONTH, label: "Este mês", href: "/kanban?period=THIS_MONTH" },
  { id: KanbanShortcut.BLOCKED, label: "Bloqueadas", href: "/kanban?status=BLOCKED" },
];

export type KanbanFilterValues = {
  period: KanbanPeriodOption;
  from: string;
  to: string;
  titleQuery?: string;
  areaId?: string;
  projectId?: string;
  ownerId?: string;
  participantId?: string;
  domainId?: string;
  nature?: Nature;
  priority?: Priority;
  architectureRole?: ArchitectureRole;
  effort?: EffortListFilter;
  status?: ActivityStatus;
  includeCancelled: boolean;
  mine: boolean;
};

export type KanbanSearchParams = Record<string, string | string[] | undefined>;

const PERIOD_SET = new Set<string>(KANBAN_PERIOD_OPTIONS);
const NATURE_SET = new Set<string>(Object.values(Nature));
const PRIORITY_SET = new Set<string>(Object.values(Priority));
const ROLE_SET = new Set<string>(Object.values(ArchitectureRole));
const EFFORT_SET = new Set<string>(Object.values(Effort));
const STATUS_SET = new Set<string>(Object.values(ActivityStatus));

function firstParam(params: KanbanSearchParams, key: string): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

function optionalUuid(params: KanbanSearchParams, key: string): string | undefined {
  const value = firstParam(params, key);
  return value && isUuid(value) ? value : undefined;
}

function isTruthyParam(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "on";
}

function parsePeriod(value: string | undefined): KanbanPeriodOption {
  if (value && PERIOD_SET.has(value)) {
    return value as KanbanPeriodOption;
  }
  return KanbanPeriodOption.ALL;
}

function parseEnum<T extends string>(value: string | undefined, allowed: Set<string>): T | undefined {
  if (value && allowed.has(value)) {
    return value as T;
  }
  return undefined;
}

function parseEffort(value: string | undefined): EffortListFilter | undefined {
  if (value === EFFORT_FILTER_UNSET) {
    return EFFORT_FILTER_UNSET;
  }
  return parseEnum<Effort>(value, EFFORT_SET);
}

function customPeriodError(from: string, to: string): string | undefined {
  if (!isCivilDateString(from) || !isCivilDateString(to)) {
    return "Informe a data inicial e a data final do período personalizado.";
  }
  if (from > to) {
    return "A data final deve ser igual ou posterior à data inicial.";
  }
  return undefined;
}

export const DEFAULT_KANBAN_FILTER_VALUES: KanbanFilterValues = {
  period: KanbanPeriodOption.ALL,
  from: "",
  to: "",
  includeCancelled: false,
  mine: false,
};

export type ParsedKanbanFilters = {
  values: KanbanFilterValues;
  error?: string;
};

export function parseKanbanSearchParams(params: KanbanSearchParams): ParsedKanbanFilters {
  const period = parsePeriod(firstParam(params, "period"));
  const fromRaw = firstParam(params, "from") ?? "";
  const toRaw = firstParam(params, "to") ?? "";
  const from = period === KanbanPeriodOption.CUSTOM ? fromRaw : "";
  const to = period === KanbanPeriodOption.CUSTOM ? toRaw : "";

  const values: KanbanFilterValues = {
    period,
    from,
    to,
    titleQuery: firstParam(params, "title"),
    areaId: optionalUuid(params, "area"),
    projectId: optionalUuid(params, "project"),
    ownerId: optionalUuid(params, "owner"),
    participantId: optionalUuid(params, "participant"),
    domainId: optionalUuid(params, "domain"),
    nature: parseEnum<Nature>(firstParam(params, "nature"), NATURE_SET),
    priority: parseEnum<Priority>(firstParam(params, "priority"), PRIORITY_SET),
    architectureRole: parseEnum<ArchitectureRole>(firstParam(params, "role"), ROLE_SET),
    effort: parseEffort(firstParam(params, "effort")),
    status: parseEnum<ActivityStatus>(firstParam(params, "status"), STATUS_SET),
    includeCancelled: isTruthyParam(firstParam(params, "includeCancelled")),
    mine: isTruthyParam(firstParam(params, "mine")),
  };

  if (period === KanbanPeriodOption.CUSTOM) {
    const error = customPeriodError(from, to);
    if (error) {
      return { values, error };
    }
  }

  return { values };
}

export function hasActiveKanbanFilters(values: KanbanFilterValues): boolean {
  return (
    values.period !== KanbanPeriodOption.ALL ||
    Boolean(values.titleQuery) ||
    Boolean(values.areaId) ||
    Boolean(values.projectId) ||
    Boolean(values.ownerId) ||
    Boolean(values.participantId) ||
    Boolean(values.domainId) ||
    Boolean(values.nature) ||
    Boolean(values.priority) ||
    Boolean(values.architectureRole) ||
    Boolean(values.effort) ||
    Boolean(values.status) ||
    values.includeCancelled ||
    values.mine
  );
}

function hasDimensionFilters(values: KanbanFilterValues): boolean {
  return Boolean(
    values.titleQuery ||
      values.areaId ||
      values.projectId ||
      values.ownerId ||
      values.participantId ||
      values.domainId ||
      values.nature ||
      values.priority ||
      values.architectureRole ||
      values.effort,
  );
}

export function activeKanbanShortcut(values: KanbanFilterValues): KanbanShortcut | null {
  if (!hasActiveKanbanFilters(values)) {
    return KanbanShortcut.ALL;
  }

  if (
    values.period === KanbanPeriodOption.THIS_WEEK &&
    values.mine &&
    !values.includeCancelled &&
    !values.status &&
    !hasDimensionFilters(values)
  ) {
    return KanbanShortcut.MY_WEEK;
  }

  if (
    values.period === KanbanPeriodOption.THIS_MONTH &&
    !values.mine &&
    !values.includeCancelled &&
    !values.status &&
    !hasDimensionFilters(values)
  ) {
    return KanbanShortcut.THIS_MONTH;
  }

  if (
    values.status === ActivityStatus.BLOCKED &&
    values.period === KanbanPeriodOption.ALL &&
    !values.mine &&
    !values.includeCancelled &&
    !hasDimensionFilters(values)
  ) {
    return KanbanShortcut.BLOCKED;
  }

  return null;
}

export function toTemporalQuery(values: KanbanFilterValues): TemporalQuery {
  if (values.period === KanbanPeriodOption.ALL) {
    return { mode: TemporalQueryMode.ALL };
  }
  if (values.period === KanbanPeriodOption.UNPLANNED) {
    return { mode: TemporalQueryMode.UNPLANNED };
  }
  if (values.period === KanbanPeriodOption.CUSTOM) {
    return {
      mode: TemporalQueryMode.PERIOD,
      period: { from: values.from, to: values.to },
    };
  }
  return { mode: TemporalQueryMode.PERIOD, period: values.period };
}

export function toActivityListFilter(
  values: KanbanFilterValues,
  actorId: string,
  options?: { skipTemporal?: boolean },
): ActivityListFilter {
  const statusCancelled = values.status === ActivityStatus.CANCELLED;
  return {
    titleQuery: values.titleQuery,
    projectId: values.projectId,
    includeCancelled: values.includeCancelled || statusCancelled,
    status: values.status,
    areaId: values.areaId,
    ownerId: values.ownerId,
    participantId: values.participantId,
    involvedUserId: values.mine ? actorId : undefined,
    domainId: values.domainId,
    nature: values.nature,
    priority: values.priority,
    architectureRole: values.architectureRole,
    effort: values.effort,
    temporal: options?.skipTemporal ? undefined : toTemporalQuery(values),
  };
}

export function splitKanbanActivities(activities: readonly ActivityListItem[]): {
  board: ActivityListItem[];
  cancelled: ActivityListItem[];
} {
  const board: ActivityListItem[] = [];
  const cancelled: ActivityListItem[] = [];
  for (const activity of activities) {
    if (activity.status === ActivityStatus.CANCELLED) {
      cancelled.push(activity);
    } else {
      board.push(activity);
    }
  }
  return { board, cancelled };
}

export function shouldShowCancelledList(values: KanbanFilterValues): boolean {
  return values.includeCancelled || values.status === ActivityStatus.CANCELLED;
}
