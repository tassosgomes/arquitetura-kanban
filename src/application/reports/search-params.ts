import { z } from "zod";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { isCivilDateString } from "@/domain/calendar/civil-date";
import {
  ArchitectureRole,
  Effort,
  Nature,
  Priority,
} from "@/domain/catalog/classifications";
import { EFFORT_FILTER_UNSET, type EffortListFilter } from "@/application/activities/types";
import { PeriodPreset, TemporalQueryMode, type TemporalQuery } from "@/application/temporal";
import type { ManagementDimensionFilters, ManagementQuery } from "@/application/reports/types";

export const ManagementPeriodOption = {
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

export type ManagementPeriodOption =
  (typeof ManagementPeriodOption)[keyof typeof ManagementPeriodOption];

export const MANAGEMENT_PERIOD_OPTIONS: readonly ManagementPeriodOption[] = [
  ManagementPeriodOption.ALL,
  ManagementPeriodOption.UNPLANNED,
  ManagementPeriodOption.THIS_WEEK,
  ManagementPeriodOption.LAST_WEEK,
  ManagementPeriodOption.THIS_MONTH,
  ManagementPeriodOption.LAST_MONTH,
  ManagementPeriodOption.THIS_QUARTER,
  ManagementPeriodOption.THIS_YEAR,
  ManagementPeriodOption.CUSTOM,
];

export const MANAGEMENT_PERIOD_LABELS: Record<ManagementPeriodOption, string> = {
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

/** Shared default for dashboard (T26) and reports (T27). */
export const DEFAULT_MANAGEMENT_PERIOD = ManagementPeriodOption.THIS_MONTH;

export const ManagementShortcut = {
  THIS_MONTH: "THIS_MONTH",
  THIS_WEEK: "THIS_WEEK",
  LAST_WEEK: "LAST_WEEK",
  LAST_MONTH: "LAST_MONTH",
  THIS_QUARTER: "THIS_QUARTER",
  THIS_YEAR: "THIS_YEAR",
  ALL: "ALL",
  UNPLANNED: "UNPLANNED",
} as const;

export type ManagementShortcut = (typeof ManagementShortcut)[keyof typeof ManagementShortcut];

export const MANAGEMENT_SHORTCUTS: readonly {
  id: ManagementShortcut;
  label: string;
  period: ManagementPeriodOption;
}[] = [
  { id: ManagementShortcut.THIS_MONTH, label: "Este mês", period: ManagementPeriodOption.THIS_MONTH },
  { id: ManagementShortcut.THIS_WEEK, label: "Esta semana", period: ManagementPeriodOption.THIS_WEEK },
  { id: ManagementShortcut.LAST_WEEK, label: "Semana passada", period: ManagementPeriodOption.LAST_WEEK },
  { id: ManagementShortcut.LAST_MONTH, label: "Mês passado", period: ManagementPeriodOption.LAST_MONTH },
  {
    id: ManagementShortcut.THIS_QUARTER,
    label: "Este trimestre",
    period: ManagementPeriodOption.THIS_QUARTER,
  },
  { id: ManagementShortcut.THIS_YEAR, label: "Este ano", period: ManagementPeriodOption.THIS_YEAR },
  { id: ManagementShortcut.ALL, label: "Todas", period: ManagementPeriodOption.ALL },
  {
    id: ManagementShortcut.UNPLANNED,
    label: "Sem planejamento",
    period: ManagementPeriodOption.UNPLANNED,
  },
];

export type ManagementFilterValues = {
  period: ManagementPeriodOption;
  from: string;
  to: string;
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
  type?: ActivityType;
};

export const DEFAULT_MANAGEMENT_FILTER_VALUES: ManagementFilterValues = {
  period: DEFAULT_MANAGEMENT_PERIOD,
  from: "",
  to: "",
};

export type ManagementSearchParams = Record<string, string | string[] | undefined>;

export type ParsedManagementSearchParams = {
  values: ManagementFilterValues;
  query: ManagementQuery;
  page: number;
  error?: string;
};

const PERIOD_SET = new Set<string>(MANAGEMENT_PERIOD_OPTIONS);
const NATURE_SET = new Set<string>(Object.values(Nature));
const PRIORITY_SET = new Set<string>(Object.values(Priority));
const ROLE_SET = new Set<string>(Object.values(ArchitectureRole));
const EFFORT_SET = new Set<string>(Object.values(Effort));
const STATUS_SET = new Set<string>(Object.values(ActivityStatus));
const TYPE_SET = new Set<string>(Object.values(ActivityType));

function firstParam(params: ManagementSearchParams, key: string): string | undefined {
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

function optionalUuid(params: ManagementSearchParams, key: string): string | undefined {
  const value = firstParam(params, key);
  return value && isUuid(value) ? value : undefined;
}

function parseEnum<T extends string>(value: string | undefined, allowed: Set<string>): T | undefined {
  if (value && allowed.has(value)) {
    return value as T;
  }
  return undefined;
}

function parsePeriod(value: string | undefined): ManagementPeriodOption {
  if (value && PERIOD_SET.has(value)) {
    return value as ManagementPeriodOption;
  }
  return DEFAULT_MANAGEMENT_PERIOD;
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

export function toTemporalQuery(values: ManagementFilterValues): TemporalQuery {
  if (values.period === ManagementPeriodOption.ALL) {
    return { mode: TemporalQueryMode.ALL };
  }
  if (values.period === ManagementPeriodOption.UNPLANNED) {
    return { mode: TemporalQueryMode.UNPLANNED };
  }
  if (values.period === ManagementPeriodOption.CUSTOM) {
    return {
      mode: TemporalQueryMode.PERIOD,
      period: { from: values.from, to: values.to },
    };
  }
  return { mode: TemporalQueryMode.PERIOD, period: values.period };
}

export function toManagementDimensionFilters(
  values: ManagementFilterValues,
): ManagementDimensionFilters | undefined {
  const filters: ManagementDimensionFilters = {};
  if (values.areaId) {
    filters.areaId = values.areaId;
  }
  if (values.projectId) {
    filters.projectId = values.projectId;
  }
  if (values.ownerId) {
    filters.ownerId = values.ownerId;
  }
  if (values.participantId) {
    filters.participantId = values.participantId;
  }
  if (values.domainId) {
    filters.domainId = values.domainId;
  }
  if (values.nature) {
    filters.nature = values.nature;
  }
  if (values.priority) {
    filters.priority = values.priority;
  }
  if (values.architectureRole) {
    filters.architectureRole = values.architectureRole;
  }
  if (values.effort) {
    filters.effort = values.effort;
  }
  if (values.status) {
    filters.status = values.status;
  }
  if (values.type) {
    filters.type = values.type;
  }
  return Object.keys(filters).length > 0 ? filters : undefined;
}

export function toManagementQuery(values: ManagementFilterValues): ManagementQuery {
  return {
    temporal: toTemporalQuery(values),
    filters: toManagementDimensionFilters(values),
  };
}

export function parsePageParam(params: ManagementSearchParams): number {
  const raw = firstParam(params, "page");
  if (!raw) {
    return 1;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function parseManagementSearchParams(
  params: ManagementSearchParams,
): ParsedManagementSearchParams {
  const period = parsePeriod(firstParam(params, "period"));
  const fromRaw = firstParam(params, "from") ?? "";
  const toRaw = firstParam(params, "to") ?? "";
  const from = period === ManagementPeriodOption.CUSTOM ? fromRaw : "";
  const to = period === ManagementPeriodOption.CUSTOM ? toRaw : "";

  const values: ManagementFilterValues = {
    period,
    from,
    to,
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
    type: parseEnum<ActivityType>(firstParam(params, "type"), TYPE_SET),
  };

  const page = parsePageParam(params);

  if (period === ManagementPeriodOption.CUSTOM) {
    const error = customPeriodError(from, to);
    if (error) {
      return {
        values,
        query: {
          temporal: { mode: TemporalQueryMode.ALL },
          filters: toManagementDimensionFilters(values),
        },
        page,
        error,
      };
    }
  }

  return {
    values,
    query: toManagementQuery(values),
    page,
  };
}

export function hasDimensionFilters(values: ManagementFilterValues): boolean {
  return Boolean(
    values.areaId ||
      values.projectId ||
      values.ownerId ||
      values.participantId ||
      values.domainId ||
      values.nature ||
      values.priority ||
      values.architectureRole ||
      values.effort ||
      values.status ||
      values.type,
  );
}

export function hasActiveManagementFilters(values: ManagementFilterValues): boolean {
  return values.period !== DEFAULT_MANAGEMENT_PERIOD || hasDimensionFilters(values);
}

export function activeManagementShortcut(values: ManagementFilterValues): ManagementShortcut | null {
  if (hasDimensionFilters(values)) {
    return null;
  }
  for (const shortcut of MANAGEMENT_SHORTCUTS) {
    if (values.period === shortcut.period) {
      return shortcut.id;
    }
  }
  return null;
}

export function serializeManagementFilterValues(
  values: ManagementFilterValues,
  options?: { page?: number },
): URLSearchParams {
  const params = new URLSearchParams();
  if (values.period !== DEFAULT_MANAGEMENT_PERIOD) {
    params.set("period", values.period);
  }
  if (values.period === ManagementPeriodOption.CUSTOM) {
    if (values.from) {
      params.set("from", values.from);
    }
    if (values.to) {
      params.set("to", values.to);
    }
  }
  if (values.areaId) {
    params.set("area", values.areaId);
  }
  if (values.projectId) {
    params.set("project", values.projectId);
  }
  if (values.ownerId) {
    params.set("owner", values.ownerId);
  }
  if (values.participantId) {
    params.set("participant", values.participantId);
  }
  if (values.domainId) {
    params.set("domain", values.domainId);
  }
  if (values.nature) {
    params.set("nature", values.nature);
  }
  if (values.priority) {
    params.set("priority", values.priority);
  }
  if (values.architectureRole) {
    params.set("role", values.architectureRole);
  }
  if (values.effort) {
    params.set("effort", values.effort);
  }
  if (values.status) {
    params.set("status", values.status);
  }
  if (values.type) {
    params.set("type", values.type);
  }
  if (options?.page && options.page > 1) {
    params.set("page", String(options.page));
  }
  return params;
}

function temporalToFilterPeriod(temporal: TemporalQuery): Pick<
  ManagementFilterValues,
  "period" | "from" | "to"
> {
  if (temporal.mode === TemporalQueryMode.ALL) {
    return { period: ManagementPeriodOption.ALL, from: "", to: "" };
  }
  if (temporal.mode === TemporalQueryMode.UNPLANNED) {
    return { period: ManagementPeriodOption.UNPLANNED, from: "", to: "" };
  }
  if (typeof temporal.period === "string") {
    return { period: temporal.period, from: "", to: "" };
  }
  return {
    period: ManagementPeriodOption.CUSTOM,
    from: temporal.period.from,
    to: temporal.period.to,
  };
}

export function serializeManagementQuery(query: ManagementQuery): URLSearchParams {
  const { period, from, to } = temporalToFilterPeriod(query.temporal);
  const filters = query.filters ?? {};
  return serializeManagementFilterValues({
    period,
    from,
    to,
    areaId: filters.areaId,
    projectId: filters.projectId,
    ownerId: filters.ownerId,
    participantId: filters.participantId,
    domainId: filters.domainId,
    nature: filters.nature,
    priority: filters.priority,
    architectureRole: filters.architectureRole,
    effort: filters.effort,
    status: filters.status,
    type: filters.type,
  });
}

export function managementHref(path: string, values: ManagementFilterValues, page = 1): string {
  const query = serializeManagementFilterValues(values, { page }).toString();
  return query ? `${path}?${query}` : path;
}

export function reportsCsvHref(query: ManagementQuery): string {
  const serialized = serializeManagementQuery(query).toString();
  return serialized ? `/api/reports/csv?${serialized}` : "/api/reports/csv";
}
