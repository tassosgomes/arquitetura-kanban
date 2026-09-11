"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
}: DashboardFiltersProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<ManagementPeriodOption>(values.period);
  const activeShortcut = activeManagementShortcut(values);
  const canClear = hasActiveManagementFilters(values);

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
    appendIfPresent(params, "area", data.get("area"));
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
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos de período">
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
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                  selected
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {shortcut.label}
              </Link>
            );
          })}
        </div>
        {canClear ? (
          <Link
            href={basePath}
            className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Limpar filtros
          </Link>
        ) : null}
      </div>

      <form className="flex flex-col gap-4" onSubmit={submitFilters}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-900">Período</span>
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
                <span className="text-sm font-medium text-zinc-900">De</span>
                <input
                  type="date"
                  name="from"
                  className={CONTROL_CLASS_NAME}
                  defaultValue={values.from}
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-zinc-900">Até</span>
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

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-900">Área</span>
            <select name="area" className={CONTROL_CLASS_NAME} defaultValue={values.areaId ?? ""}>
              <option value="">Todas</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-900">Projeto</span>
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
            <span className="text-sm font-medium text-zinc-900">Responsável</span>
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
            <span className="text-sm font-medium text-zinc-900">Participante</span>
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
            <span className="text-sm font-medium text-zinc-900">Domínio</span>
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
            <span className="text-sm font-medium text-zinc-900">Natureza</span>
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
            <span className="text-sm font-medium text-zinc-900">Prioridade</span>
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
            <span className="text-sm font-medium text-zinc-900">Papel da Arquitetura</span>
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
            <span className="text-sm font-medium text-zinc-900">Esforço</span>
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
            <span className="text-sm font-medium text-zinc-900">Status no retrato</span>
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
            <span className="text-sm font-medium text-zinc-900">Tipo</span>
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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-zinc-500">
            Filtros de área, responsável, projeto e demais dimensões usam o retrato no encerramento,
            não o estado atual do Kanban. Canceladas entram no total quando pertencem ao recorte.
          </p>
          <button
            type="submit"
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Aplicar filtros
          </button>
        </div>
      </form>
    </section>
  );
}
