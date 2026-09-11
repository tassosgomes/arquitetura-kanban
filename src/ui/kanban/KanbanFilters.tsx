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
import { ACTIVITY_STATUS_LABELS, ActivityStatus } from "@/domain/activity/enums";
import {
  activeKanbanShortcut,
  KANBAN_PERIOD_LABELS,
  KANBAN_PERIOD_OPTIONS,
  KANBAN_SHORTCUTS,
  KanbanPeriodOption,
  hasActiveKanbanFilters,
  type KanbanFilterValues,
} from "@/application/activities/kanban-filters";
import { EFFORT_FILTER_UNSET } from "@/application/activities/types";
import { CONTROL_CLASS_NAME } from "@/ui/projects/project-types";

export type KanbanFilterOption = {
  id: string;
  label: string;
};

type KanbanFiltersProps = {
  values: KanbanFilterValues;
  areas: KanbanFilterOption[];
  projects: KanbanFilterOption[];
  users: KanbanFilterOption[];
  domains: KanbanFilterOption[];
};

function appendIfPresent(params: URLSearchParams, key: string, value: FormDataEntryValue | null) {
  if (typeof value === "string" && value.trim() !== "") {
    params.set(key, value);
  }
}

const FILTERS_EXPANDED_STORAGE_KEY = "kanban-filters-expanded";

export function KanbanFilters({ values, areas, projects, users, domains }: KanbanFiltersProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<KanbanPeriodOption>(values.period);
  const [expanded, setExpanded] = useState(true);
  const activeShortcut = activeKanbanShortcut(values);
  const canClear = hasActiveKanbanFilters(values);
  const bodyId = useId();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FILTERS_EXPANDED_STORAGE_KEY);
      if (stored !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpanded(stored !== "0");
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — mantém expandido por padrão.
    }
  }, []);

  function toggleExpanded() {
    setExpanded((value) => {
      const next = !value;
      try {
        localStorage.setItem(FILTERS_EXPANDED_STORAGE_KEY, next ? "1" : "0");
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

    appendIfPresent(params, "period", selectedPeriod === KanbanPeriodOption.ALL ? "" : selectedPeriod);
    if (selectedPeriod === KanbanPeriodOption.CUSTOM) {
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
    if (data.get("includeCancelled") === "1") {
      params.set("includeCancelled", "1");
    }
    if (data.get("mine") === "1") {
      params.set("mine", "1");
    }

    const query = params.toString();
    router.push(query ? `/kanban?${query}` : "/kanban");
  }

  return (
    <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Atalhos de filtro">
          <span className="mr-1 flex items-center gap-1 font-mono text-code-sm uppercase tracking-wider text-outline">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              tune
            </span>
            Presets:
          </span>
          {KANBAN_SHORTCUTS.map((shortcut) => {
            const selected = activeShortcut === shortcut.id;
            return (
              <Link
                key={shortcut.id}
                href={shortcut.href}
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
              href="/kanban"
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
                onChange={(event) => setPeriod(event.target.value as KanbanPeriodOption)}
              >
                {KANBAN_PERIOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {KANBAN_PERIOD_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>

            {period === KanbanPeriodOption.CUSTOM ? (
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

            <label className="flex flex-col gap-1.5">
              <span className="text-label-sm text-on-surface-variant">Área</span>
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
              <span className="text-label-sm text-on-surface-variant">Domínio</span>
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
              <span className="text-label-sm text-on-surface-variant">Status</span>
              <select name="status" className={CONTROL_CLASS_NAME} defaultValue={values.status ?? ""}>
                <option value="">Todos</option>
                {Object.values(ActivityStatus).map((status) => (
                  <option key={status} value={status}>
                    {ACTIVITY_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-space-md">
              <label className="inline-flex cursor-pointer items-center gap-1.5 select-none text-label-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  name="includeCancelled"
                  value="1"
                  defaultChecked={values.includeCancelled}
                  className="size-3.5 rounded border-outline-variant text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                Incluir cancelados
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 select-none text-label-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  name="mine"
                  value="1"
                  defaultChecked={values.mine}
                  className="size-3.5 rounded border-outline-variant text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                Somente minhas
              </label>
            </div>
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
