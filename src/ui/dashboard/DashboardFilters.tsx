"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ACTIVITY_NATURE_LABELS,
  ARCHITECTURE_ROLE_LABELS,
  ArchitectureRole,
  EFFORT_LABELS,
  Effort,
  Nature,
  PRIORITY_LABELS,
  Priority,
} from "@/domain/catalog/classifications";
import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TYPE_LABELS,
  ActivityStatus,
  ActivityType,
} from "@/domain/activity/enums";
import { EFFORT_FILTER_UNSET } from "@/application/activities/types";
import {
  DEFAULT_MANAGEMENT_PERIOD,
  MANAGEMENT_PERIOD_LABELS,
  MANAGEMENT_PERIOD_OPTIONS,
  MANAGEMENT_SHORTCUTS,
  ManagementPeriodOption,
  activeManagementShortcut,
  hasActiveManagementFilters,
  managementHref,
  type ManagementFilterValues,
} from "@/application/reports/search-params";
import { CONTROL_CLASS_NAME } from "@/ui/projects/project-types";

export type DashboardFilterOption = {
  id: string;
  label: string;
};

type DashboardFiltersProps = {
  values: ManagementFilterValues;
  areas: DashboardFilterOption[];
  projects: DashboardFilterOption[];
  users: DashboardFilterOption[];
  domains: DashboardFilterOption[];
  /** Dashboard (T26) or reports (T27) — same ManagementQuery. */
  basePath?: string;
  /** Keep the legacy area-union filter, use the Book's requester filter, or hide it. */
  areaFilterMode?: "union" | "requesting" | "hidden";
};

function appendIfPresent(params: URLSearchParams, key: string, value: FormDataEntryValue | null) {
  if (typeof value === "string" && value.trim() !== "") {
    params.set(key, value);
  }
}

export function DashboardFilters({
  values,
  areas,
  projects,
  users,
  domains,
  basePath = "/dashboard",
  areaFilterMode = "union",
}: DashboardFiltersProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<ManagementPeriodOption>(values.period);
  const [expanded, setExpanded] = useState(false);
  const activeShortcut = activeManagementShortcut(values);
  const canClear = hasActiveManagementFilters(values);
  const bodyId = useId();
  const storageKey = `management-filters-expanded:${basePath}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpanded(stored !== "0");
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — mantém expandido por padrão.
    }
  }, [storageKey]);

  function toggleExpanded() {
    setExpanded((value) => {
      const next = !value;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // localStorage indisponível — estado só dura a sessão atual.
      }
      return next;
    });
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const selectedPeriod = String(data.get("period") ?? "");

    if (selectedPeriod && selectedPeriod !== DEFAULT_MANAGEMENT_PERIOD) {
      params.set("period", selectedPeriod);
    }
    if (selectedPeriod === ManagementPeriodOption.CUSTOM) {
      appendIfPresent(params, "from", data.get("from"));
      appendIfPresent(params, "to", data.get("to"));
    }
    if (areaFilterMode === "union") {
      appendIfPresent(params, "area", data.get("area"));
    } else if (areaFilterMode === "requesting") {
      appendIfPresent(params, "requestingArea", data.get("requestingArea"));
    } else if (values.requestingAreaId) {
      params.set("requestingArea", values.requestingAreaId);
    }
    appendIfPresent(params, "project", data.get("project"));
    appendIfPresent(params, "owner", data.get("owner"));
    appendIfPresent(params, "participant", data.get("participant"));
    appendIfPresent(params, "domain", data.get("domain"));
    appendIfPresent(params, "nature", data.get("nature"));
    appendIfPresent(params, "priority", data.get("priority"));
    appendIfPresent(params, "role", data.get("role"));
    appendIfPresent(params, "effort", data.get("effort"));
    appendIfPresent(params, "status", data.get("status"));
    appendIfPresent(params, "type", data.get("type"));

    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Atalhos de período">
          {MANAGEMENT_SHORTCUTS.map((shortcut) => {
            const selected = activeShortcut === shortcut.id;
            const href = managementHref(basePath, {
              period: shortcut.period,
              from: "",
              to: "",
            });
            return (
              <Link
                key={shortcut.id}
                href={href}
                aria-current={selected ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-label-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selected
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {shortcut.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {canClear ? (
            <Link
              href={basePath}
              className="text-label-sm font-semibold text-primary underline hover:text-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Limpar filtros
            </Link>
          ) : null}
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls={bodyId}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {expanded ? "expand_less" : "expand_more"}
            </span>
            {expanded ? "Recolher" : "Expandir"}
          </button>
        </div>
      </div>

      {expanded ? (
        <form id={bodyId} className="flex flex-col gap-space-md" onSubmit={submitFilters}>
          <div className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Período</span>
              <select
                name="period"
                className={CONTROL_CLASS_NAME}
                value={period}
                onChange={(event) => setPeriod(event.target.value as ManagementPeriodOption)}
              >
                {MANAGEMENT_PERIOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {MANAGEMENT_PERIOD_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>

            {period === ManagementPeriodOption.CUSTOM ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-label-sm text-on-surface-variant">De</span>
                  <input
                    type="date"
                    name="from"
                    className={CONTROL_CLASS_NAME}
                    defaultValue={values.from}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-label-sm text-on-surface-variant">Até</span>
                  <input
                    type="date"
                    name="to"
                    className={CONTROL_CLASS_NAME}
                    defaultValue={values.to}
                    required
                  />
                </label>
              </>
            ) : null}

            {areaFilterMode !== "hidden" ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-label-sm text-on-surface-variant">
                  {areaFilterMode === "requesting" ? "Área solicitante" : "Área"}
                </span>
                <select
                  name={areaFilterMode === "requesting" ? "requestingArea" : "area"}
                  className={CONTROL_CLASS_NAME}
                  defaultValue={
                    areaFilterMode === "requesting"
                      ? (values.requestingAreaId ?? "")
                      : (values.areaId ?? "")
                  }
                >
                  <option value="">Todas</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : values.requestingAreaId ? (
              <input type="hidden" name="requestingArea" value={values.requestingAreaId} />
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Projeto</span>
              <select
                name="project"
                className={CONTROL_CLASS_NAME}
                defaultValue={values.projectId ?? ""}
              >
                <option value="">Todos</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Responsável</span>
              <select name="owner" className={CONTROL_CLASS_NAME} defaultValue={values.ownerId ?? ""}>
                <option value="">Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Participante</span>
              <select
                name="participant"
                className={CONTROL_CLASS_NAME}
                defaultValue={values.participantId ?? ""}
              >
                <option value="">Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Categoria</span>
              <select
                name="domain"
                className={CONTROL_CLASS_NAME}
                defaultValue={values.domainId ?? ""}
              >
                <option value="">Todos</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Natureza</span>
              <select name="nature" className={CONTROL_CLASS_NAME} defaultValue={values.nature ?? ""}>
                <option value="">Todas</option>
                {Object.values(Nature).map((nature) => (
                  <option key={nature} value={nature}>
                    {ACTIVITY_NATURE_LABELS[nature]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Prioridade</span>
              <select
                name="priority"
                className={CONTROL_CLASS_NAME}
                defaultValue={values.priority ?? ""}
              >
                <option value="">Todas</option>
                {Object.values(Priority).map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Papel da Arquitetura</span>
              <select
                name="role"
                className={CONTROL_CLASS_NAME}
                defaultValue={values.architectureRole ?? ""}
              >
                <option value="">Todos</option>
                {Object.values(ArchitectureRole).map((role) => (
                  <option key={role} value={role}>
                    {ARCHITECTURE_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Esforço</span>
              <select name="effort" className={CONTROL_CLASS_NAME} defaultValue={values.effort ?? ""}>
                <option value="">Todos</option>
                {Object.values(Effort).map((effort) => (
                  <option key={effort} value={effort}>
                    {EFFORT_LABELS[effort]}
                  </option>
                ))}
                <option value={EFFORT_FILTER_UNSET}>Não informado</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Status no retrato</span>
              <select name="status" className={CONTROL_CLASS_NAME} defaultValue={values.status ?? ""}>
                <option value="">Todos</option>
                {Object.values(ActivityStatus).map((status) => (
                  <option key={status} value={status}>
                    {ACTIVITY_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Tipo</span>
              <select name="type" className={CONTROL_CLASS_NAME} defaultValue={values.type ?? ""}>
                <option value="">Todos</option>
                {Object.values(ActivityType).map((type) => (
                  <option key={type} value={type}>
                    {ACTIVITY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-label-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                filter_alt
              </span>
              Aplicar filtros
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
