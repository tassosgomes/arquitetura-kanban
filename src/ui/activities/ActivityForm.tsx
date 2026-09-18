"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ActionResult } from "@/app/actions/action-result";
import type { ActivityRecord } from "@/application/activities";
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
  KANBAN_COLUMN_STATUSES,
} from "@/domain/activity/enums";
import { FormField, getFormFieldAriaProps } from "@/ui/forms/FormField";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";
import { FieldError } from "@/ui/forms/FieldError";
import { SearchableSelect } from "@/ui/forms/SearchableSelect";
import { CONTROL_CLASS_NAME, formatUserLabel } from "@/ui/projects/project-types";
import { useMarkFormDirty } from "@/ui/realtime/useProtectOpenEdit";
import type {
  ActivityFormValues,
  ActivityProjectOption,
  ActivitySelectionOption,
  ActivityUserOption,
  CatalogOption,
} from "@/ui/activities/activity-types";

type ActivityFormProps = {
  mode: "create" | "edit";
  action: (input: unknown) => Promise<ActionResult<ActivityRecord>>;
  areas: CatalogOption[];
  domains: CatalogOption[];
  users: ActivityUserOption[];
  projects: ActivityProjectOption[];
  initial: ActivityFormValues;
  cancelHref: string;
  defaultOwnerId?: string;
};

type FormState = ActionResult<ActivityRecord> | null;

function fieldError(state: FormState, field: string): string | undefined {
  if (!state || state.ok) {
    return undefined;
  }
  return state.error.fields?.[field]?.[0];
}

const ACTIVITY_ERROR_TARGETS = [
  { field: "title", id: "activity-title", label: "Título" },
  { field: "description", id: "activity-description", label: "Descrição" },
  { field: "type", id: "activity-type", label: "Tipo" },
  { field: "projectId", id: "activity-project", label: "Projeto" },
  { field: "domainId", id: "activity-domain", label: "Categoria" },
  { field: "nature", id: "activity-nature", label: "Natureza" },
  { field: "architectureRole", id: "activity-role", label: "Papel da Arquitetura" },
  { field: "priority", id: "activity-priority", label: "Prioridade" },
  { field: "effort", id: "activity-effort", label: "Esforço" },
  { field: "requestingAreaId", id: "activity-area", label: "Área solicitante" },
  { field: "involvedAreaIds", id: "activity-involved", label: "Áreas envolvidas" },
  { field: "ownerId", id: "activity-owner", label: "Responsável" },
  { field: "participantIds", id: "activity-participants", label: "Participantes" },
  { field: "status", id: "activity-status", label: "Status" },
  { field: "startDate", id: "activity-start", label: "Data de início" },
  { field: "expectedEndDate", id: "activity-end", label: "Previsão de término" },
  { field: "completedDate", id: "activity-completed", label: "Data de conclusão" },
  { field: "observations", id: "activity-observations", label: "Observações" },
] as const;

function activityErrorEntries(state: FormState) {
  return ACTIVITY_ERROR_TARGETS.flatMap((target) => {
    const message = fieldError(state, target.field);
    return message ? [{ ...target, message }] : [];
  });
}

const CLASSIFICATION_REQUIRED_FIELDS = [
  "domainId",
  "nature",
  "architectureRole",
  "priority",
] as const;

const PEOPLE_REQUIRED_FIELDS = ["requestingAreaId", "ownerId", "status"] as const;

const REQUIRED_FIELD_NAMES = [
  ...CLASSIFICATION_REQUIRED_FIELDS,
  ...PEOPLE_REQUIRED_FIELDS,
] as const;

const CLASSIFICATION_ERROR_FIELDS = [
  "domainId",
  "nature",
  "architectureRole",
  "priority",
  "effort",
] as const;

const PEOPLE_ERROR_FIELDS = [
  "requestingAreaId",
  "involvedAreaIds",
  "ownerId",
  "participantIds",
  "status",
  "startDate",
  "expectedEndDate",
  "completedDate",
  "observations",
] as const;

type RequiredFieldName = (typeof REQUIRED_FIELD_NAMES)[number];

function isRequiredFieldName(name: string): name is RequiredFieldName {
  return REQUIRED_FIELD_NAMES.includes(name as RequiredFieldName);
}

function getInitialRequiredCompletion(
  initial: ActivityFormValues,
): Record<RequiredFieldName, boolean> {
  return {
    domainId: Boolean(initial.domainId.trim()),
    nature: Boolean(initial.nature.trim()),
    architectureRole: Boolean(initial.architectureRole.trim()),
    priority: Boolean(initial.priority.trim()),
    requestingAreaId: Boolean(initial.requestingAreaId.trim()),
    ownerId: Boolean(initial.ownerId.trim()),
    status: Boolean(initial.status.trim()),
  };
}

function hasErrorInFields(state: FormState, fields: readonly string[]): boolean {
  return fields.some((field) => Boolean(fieldError(state, field)));
}

function isFieldInFields(field: string, fields: readonly string[]): boolean {
  return fields.includes(field);
}

type CollapsibleFormSectionProps = {
  id: string;
  title: string;
  completed: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function CollapsibleFormSection({
  id,
  title,
  completed,
  total,
  open,
  onToggle,
  children,
}: CollapsibleFormSectionProps) {
  const headingId = `${id}-heading`;
  const contentId = `${id}-content`;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-space-md shadow-sm"
    >
      <h2 id={headingId} className="text-headline-sm text-on-surface">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-space-md rounded-xl p-space-sm text-left transition-colors hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span>{title}</span>
          <span className="flex shrink-0 items-center gap-space-sm">
            <span
              aria-live="polite"
              aria-label={`${completed} de ${total} campos obrigatórios preenchidos`}
              className="rounded-full bg-surface-container-high px-space-sm py-space-xs text-label-sm text-on-surface-variant"
            >
              {completed} de {total}
            </span>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {open ? "expand_less" : "expand_more"}
            </span>
          </span>
        </button>
      </h2>
      <div id={contentId} hidden={!open} className="mt-space-md flex flex-col gap-space-lg">
        {children}
      </div>
    </section>
  );
}

function applyPrefill(
  option: ActivityProjectOption | undefined,
  setters: {
    setParticipantIds: (value: string[]) => void;
    setNature: (value: string) => void;
    setArchitectureRole: (value: string) => void;
    setRequestingAreaId: (value: string) => void;
  },
) {
  if (!option) {
    return;
  }
  setters.setParticipantIds(option.defaults.participantIds);
  setters.setNature(option.defaults.nature);
  setters.setArchitectureRole(option.defaults.architectureRole);
  setters.setRequestingAreaId(option.defaults.requestingAreaId);
}

export function ActivityForm({
  mode,
  action,
  areas,
  domains,
  users,
  projects,
  initial,
  cancelHref,
  defaultOwnerId,
}: ActivityFormProps) {
  const router = useRouter();
  const { formProps } = useMarkFormDirty();
  const [type, setType] = useState(initial.type);
  const [projectId, setProjectId] = useState(initial.projectId);
  const [ownerId, setOwnerId] = useState(initial.ownerId);
  const [ownerWasEdited, setOwnerWasEdited] = useState(false);
  const [participantIds, setParticipantIds] = useState(initial.participantIds);
  const [involvedAreaIds, setInvolvedAreaIds] = useState(initial.involvedAreaIds);
  const [nature, setNature] = useState(initial.nature);
  const [architectureRole, setArchitectureRole] = useState(initial.architectureRole);
  const [requestingAreaId, setRequestingAreaId] = useState(initial.requestingAreaId);
  const initialRequiredCompletion = getInitialRequiredCompletion(initial);
  const [requiredCompletion, setRequiredCompletion] = useState(initialRequiredCompletion);
  const [classificationOpen, setClassificationOpen] = useState(
    () => mode === "edit" || CLASSIFICATION_REQUIRED_FIELDS.some((field) => !initialRequiredCompletion[field]),
  );
  const [peopleOpen, setPeopleOpen] = useState(
    () => mode === "edit" || PEOPLE_REQUIRED_FIELDS.some((field) => !initialRequiredCompletion[field]),
  );
  const lastAutoOpenedError = useRef<FormState>(null);

  const ownerInactive = users.some((user) => user.id === ownerId && !user.isActive);
  const areaInactive = areas.some((area) => area.id === requestingAreaId && !area.isActive);
  const domainInactive = domains.some(
    (domain) => domain.id === initial.domainId && !domain.isActive,
  );

  function setRequiredFieldFilled(field: RequiredFieldName, value: string) {
    const isFilled = value.trim().length > 0;
    setRequiredCompletion((current) =>
      current[field] === isFilled ? current : { ...current, [field]: isFilled },
    );
  }

  function handleFormChange(event: FormEvent<HTMLFormElement>) {
    formProps.onChange();
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLSelectElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    if (isRequiredFieldName(target.name)) {
      setRequiredFieldFilled(target.name, target.value);
    }
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (
      (event.metaKey || event.ctrlKey) &&
      (event.key === "Enter" || event.key === "NumpadEnter")
    ) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  }

  const [state, submit, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const values = {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        observations: String(formData.get("observations") ?? ""),
        type: String(formData.get("type") ?? ""),
        projectId: String(formData.get("projectId") ?? ""),
        requestingAreaId: String(formData.get("requestingAreaId") ?? ""),
        domainId: String(formData.get("domainId") ?? ""),
        nature: String(formData.get("nature") ?? ""),
        architectureRole: String(formData.get("architectureRole") ?? ""),
        ownerId: String(formData.get("ownerId") ?? ""),
        participantIds: formData.getAll("participantIds").map(String).filter(Boolean),
        involvedAreaIds: formData.getAll("involvedAreaIds").map(String).filter(Boolean),
        priority: String(formData.get("priority") ?? ""),
        effort: String(formData.get("effort") ?? ""),
        status: String(formData.get("status") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
        expectedEndDate: String(formData.get("expectedEndDate") ?? ""),
        completedDate: String(formData.get("completedDate") ?? ""),
        id: String(formData.get("id") ?? ""),
        version: Number(formData.get("version") ?? 0),
      };
      if (mode === "create") {
        return action({
          title: values.title,
          description: values.description,
          observations: values.observations,
          type: values.type,
          projectId: values.projectId,
          requestingAreaId: values.requestingAreaId,
          domainId: values.domainId,
          nature: values.nature,
          architectureRole: values.architectureRole,
          ownerId: values.ownerId,
          participantIds: values.participantIds,
          involvedAreaIds: values.involvedAreaIds,
          priority: values.priority,
          effort: values.effort,
          status: values.status,
          startDate: values.startDate,
          expectedEndDate: values.expectedEndDate,
          completedDate: values.completedDate,
        });
      }
      return action(values);
    },
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push(`/activities/${state.data.id}`);
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    if (!state || state.ok || state === lastAutoOpenedError.current) {
      return;
    }
    lastAutoOpenedError.current = state;

    if (hasErrorInFields(state, CLASSIFICATION_ERROR_FIELDS) && !classificationOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClassificationOpen(true);
    }
    if (hasErrorInFields(state, PEOPLE_ERROR_FIELDS) && !peopleOpen) {
      setPeopleOpen(true);
    }
  }, [classificationOpen, peopleOpen, state]);

  useEffect(() => {
    if (!state || state.ok) {
      return;
    }

    const firstError = ACTIVITY_ERROR_TARGETS.find((target) =>
      Boolean(fieldError(state, target.field)),
    );
    if (!firstError) {
      return;
    }

    if (
      (isFieldInFields(firstError.field, CLASSIFICATION_ERROR_FIELDS) && !classificationOpen) ||
      (isFieldInFields(firstError.field, PEOPLE_ERROR_FIELDS) && !peopleOpen)
    ) {
      return;
    }

    const control = document.getElementById(firstError.id);
    if (!(control instanceof HTMLElement)) {
      return;
    }

    control.scrollIntoView({ behavior: "smooth", block: "center" });
    control.focus({ preventScroll: true });
  }, [classificationOpen, peopleOpen, state]);

  const conflict = Boolean(state && !state.ok && state.error.code === "CONFLICT");
  const errorEntries = activityErrorEntries(state);
  const globalError =
    state && !state.ok && !conflict && !state.error.fields
      ? state.error.message
      : state && !state.ok && !conflict && state.error.fields && Object.keys(state.error.fields).length === 0
        ? state.error.message
        : undefined;

  function onTypeChange(nextType: string) {
    setType(nextType);
    if (nextType === ActivityType.AD_HOC) {
      setProjectId("");
    }
  }

  function onProjectChange(nextId: string) {
    setProjectId(nextId);
    if (mode === "create") {
      if (nextId && !ownerWasEdited && !ownerId && defaultOwnerId) {
        setOwnerId(defaultOwnerId);
        setRequiredFieldFilled("ownerId", defaultOwnerId);
      }
      const project = projects.find((project) => project.id === nextId);
      if (project) {
        setRequiredFieldFilled("nature", project.defaults.nature);
        setRequiredFieldFilled("architectureRole", project.defaults.architectureRole);
        setRequiredFieldFilled("requestingAreaId", project.defaults.requestingAreaId);
      }
      applyPrefill(project, {
        setParticipantIds,
        setNature,
        setArchitectureRole,
        setRequestingAreaId,
      });
    }
  }

  const areaSelectionOptions: ActivitySelectionOption[] = areas.map((area) => ({
    id: area.id,
    label: area.name,
    isActive: area.isActive,
  }));
  const userSelectionOptions: ActivitySelectionOption[] = users.map((user) => ({
    id: user.id,
    label: formatUserLabel(user),
    searchText: [user.displayName, user.email].filter(Boolean).join(" "),
    isActive: user.isActive,
  }));

  function onParticipantSelectionChange(nextIds: string[]) {
    formProps.onChange();
    setParticipantIds(nextIds);
  }

  function onInvolvedAreaSelectionChange(nextIds: string[]) {
    formProps.onChange();
    setInvolvedAreaIds(nextIds);
  }

  function onOwnerSelectionChange(nextIds: string[]) {
    formProps.onChange();
    const nextOwnerId = nextIds[0] ?? "";
    setOwnerWasEdited(true);
    setOwnerId(nextOwnerId);
    setRequiredFieldFilled("ownerId", nextOwnerId);
  }

  const classificationCompleted = CLASSIFICATION_REQUIRED_FIELDS.filter(
    (field) => requiredCompletion[field],
  ).length;
  const peopleCompleted = PEOPLE_REQUIRED_FIELDS.filter((field) => requiredCompletion[field]).length;

  return (
    <form
      action={submit}
      className="flex max-w-4xl flex-col gap-space-lg pb-24"
      noValidate
      {...formProps}
      onChange={handleFormChange}
      onKeyDown={handleFormKeyDown}
    >
      {mode === "edit" && initial.id ? (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="version" value={initial.version ?? 1} />
        </>
      ) : null}

      {conflict ? (
        <div
          className="rounded-xl border border-secondary-container/40 bg-secondary-container/10 p-space-md text-body-sm text-on-surface"
          role="alert"
        >
          <p>{state && !state.ok ? state.error.message : null}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-2 font-semibold text-primary underline hover:text-primary/80"
          >
            Recarregar os dados
          </button>
        </div>
      ) : null}

      {globalError ? (
        <p className="text-body-sm text-error" role="alert">
          {globalError}
        </p>
      ) : null}

      {errorEntries.length > 0 ? (
        <div
          id="activity-form-errors"
          className="rounded-xl border border-error/40 bg-error-container p-space-md text-body-sm text-on-error-container"
          role="alert"
          aria-live="assertive"
        >
          <h2 className="font-semibold">Revise os campos destacados:</h2>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errorEntries.map((entry) => (
              <li key={entry.field}>
                <a href={`#${entry.id}`} className="underline hover:no-underline">
                  {entry.label}: {entry.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section
        aria-labelledby="activity-section-what-heading"
        className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-space-md shadow-sm"
      >
        <h2 id="activity-section-what-heading" className="text-headline-sm text-on-surface">
          O que é
        </h2>
        <div className="mt-space-md flex flex-col gap-space-lg">
          <FormField
            id="activity-title"
            label="Título"
            required
            error={fieldError(state, "title")}
          >
            <input
              id="activity-title"
              name="title"
              type="text"
              required
              defaultValue={initial.title}
              {...getFormFieldAriaProps("activity-title", fieldError(state, "title"))}
              className={CONTROL_CLASS_NAME}
            />
          </FormField>

          <FormField
            id="activity-description"
            label="Descrição"
            error={fieldError(state, "description")}
          >
            <textarea
              id="activity-description"
              name="description"
              rows={4}
              defaultValue={initial.description}
              {...getFormFieldAriaProps("activity-description", fieldError(state, "description"))}
              className={CONTROL_CLASS_NAME}
            />
          </FormField>

          <FormField id="activity-type" label="Tipo" required error={fieldError(state, "type")}>
            <select
              id="activity-type"
              name="type"
              required
              value={type}
              onChange={(event) => onTypeChange(event.target.value)}
              {...getFormFieldAriaProps("activity-type", fieldError(state, "type"))}
              className={CONTROL_CLASS_NAME}
            >
              {Object.values(ActivityType).map((value) => (
                <option key={value} value={value}>
                  {ACTIVITY_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>

          {type === ActivityType.PROJECT ? (
            <FormField
              id="activity-project"
              label="Projeto"
              required
              error={fieldError(state, "projectId")}
              description="Valores compatíveis do projeto são sugeridos na criação e podem ser alterados."
            >
              <select
                id="activity-project"
                name="projectId"
                required
                value={projectId}
                onChange={(event) => onProjectChange(event.target.value)}
                {...getFormFieldAriaProps(
                  "activity-project",
                  fieldError(state, "projectId"),
                  true,
                )}
                className={CONTROL_CLASS_NAME}
              >
                <option value="">Selecione um projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <input type="hidden" name="projectId" value="" />
          )}
        </div>
      </section>

      <CollapsibleFormSection
        id="activity-section-classification"
        title="Classificação"
        completed={classificationCompleted}
        total={CLASSIFICATION_REQUIRED_FIELDS.length}
        open={classificationOpen}
        onToggle={() => setClassificationOpen((open) => !open)}
      >
        <div className="grid gap-space-lg md:grid-cols-2">
          <FormField
            id="activity-domain"
            label="Categoria"
            required
            error={fieldError(state, "domainId")}
            className="min-w-0"
            description={
              domainInactive
                ? "A categoria atual está inativa. Selecione uma categoria ativa para salvar."
                : undefined
            }
          >
            <select
              id="activity-domain"
              name="domainId"
              required
              defaultValue={initial.domainId}
              {...getFormFieldAriaProps(
                "activity-domain",
                fieldError(state, "domainId"),
                Boolean(domainInactive),
              )}
              className={CONTROL_CLASS_NAME}
            >
              <option value="">Selecione uma categoria</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.isActive ? domain.name : `${domain.name} (inativa)`}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="activity-nature"
            label="Natureza"
            required
            error={fieldError(state, "nature")}
            className="min-w-0"
          >
            <select
              id="activity-nature"
              name="nature"
              required
              value={nature}
              onChange={(event) => setNature(event.target.value)}
              {...getFormFieldAriaProps("activity-nature", fieldError(state, "nature"))}
              className={CONTROL_CLASS_NAME}
            >
              <option value="">Selecione a natureza</option>
              {Object.values(Nature).map((value) => (
                <option key={value} value={value}>
                  {ACTIVITY_NATURE_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="activity-role"
            label="Papel da Arquitetura"
            required
            error={fieldError(state, "architectureRole")}
            className="min-w-0"
          >
            <select
              id="activity-role"
              name="architectureRole"
              required
              value={architectureRole}
              onChange={(event) => setArchitectureRole(event.target.value)}
              {...getFormFieldAriaProps("activity-role", fieldError(state, "architectureRole"))}
              className={CONTROL_CLASS_NAME}
            >
              <option value="">Selecione o papel</option>
              {Object.values(ArchitectureRole).map((role) => (
                <option key={role} value={role}>
                  {ARCHITECTURE_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="activity-priority"
            label="Prioridade"
            required
            error={fieldError(state, "priority")}
            className="min-w-0"
          >
            <select
              id="activity-priority"
              name="priority"
              required
              defaultValue={initial.priority}
              {...getFormFieldAriaProps("activity-priority", fieldError(state, "priority"))}
              className={CONTROL_CLASS_NAME}
            >
              {Object.values(Priority).map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="activity-effort"
            label="Esforço"
            error={fieldError(state, "effort")}
            className="min-w-0"
          >
            <select
              id="activity-effort"
              name="effort"
              defaultValue={initial.effort}
              {...getFormFieldAriaProps("activity-effort", fieldError(state, "effort"))}
              className={CONTROL_CLASS_NAME}
            >
              <option value="">Não informado</option>
              {Object.values(Effort).map((value) => (
                <option key={value} value={value}>
                  {EFFORT_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>

        </div>
      </CollapsibleFormSection>

      <CollapsibleFormSection
        id="activity-section-people"
        title="Pessoas e prazos"
        completed={peopleCompleted}
        total={PEOPLE_REQUIRED_FIELDS.length}
        open={peopleOpen}
        onToggle={() => setPeopleOpen((open) => !open)}
      >
        <FormField
          id="activity-area"
          label="Área solicitante"
          required
          error={fieldError(state, "requestingAreaId")}
          description={
            areaInactive
              ? "A área atual está inativa. Selecione uma área ativa para salvar."
              : undefined
          }
        >
          <select
            id="activity-area"
            name="requestingAreaId"
            required
            value={requestingAreaId}
            onChange={(event) => {
              setRequestingAreaId(event.target.value);
              setRequiredFieldFilled("requestingAreaId", event.target.value);
            }}
            {...getFormFieldAriaProps(
              "activity-area",
              fieldError(state, "requestingAreaId"),
              Boolean(areaInactive),
            )}
            className={CONTROL_CLASS_NAME}
          >
            <option value="">Selecione uma área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.isActive ? area.name : `${area.name} (inativa)`}
              </option>
            ))}
          </select>
        </FormField>

        <fieldset className="flex flex-col gap-1.5">
          <legend
            id="activity-involved-label"
            className="text-label-md font-semibold text-on-surface"
          >
            Áreas envolvidas
          </legend>
          <p className="text-body-sm leading-5 text-on-surface-variant">
            Opcional. Áreas inativas não entram em novas associações; as já vinculadas podem ser
            mantidas.
          </p>
          <SearchableSelect
            id="activity-involved"
            name="involvedAreaIds"
            options={areaSelectionOptions}
            selectedIds={involvedAreaIds}
            onSelectionChange={onInvolvedAreaSelectionChange}
            selectionLabel="áreas envolvidas"
            selectionNoun="área envolvida"
            selectionNounPlural="áreas envolvidas"
            emptySelectionMessage="Nenhuma área envolvida selecionada"
            placeholder="Buscar área"
            noOptionsMessage="Nenhuma área ativa disponível."
            multiple
            aria-labelledby="activity-involved-label"
            {...getFormFieldAriaProps("activity-involved", fieldError(state, "involvedAreaIds"))}
          />
          <FieldError
            id={fieldError(state, "involvedAreaIds") ? "activity-involved-error" : undefined}
            message={fieldError(state, "involvedAreaIds")}
          />
        </fieldset>

      <FormField
        id="activity-owner"
        label="Responsável"
        required
        error={fieldError(state, "ownerId")}
        description={
          ownerInactive
            ? "O responsável atual está inativo. Reatribua para um usuário ativo para salvar."
            : "Exatamente um responsável principal."
        }
      >
        <SearchableSelect
          id="activity-owner"
          name="ownerId"
          options={userSelectionOptions}
          selectedIds={ownerId ? [ownerId] : []}
          onSelectionChange={onOwnerSelectionChange}
          selectionLabel="responsável"
          selectionNoun="responsável"
          selectionNounPlural="responsáveis"
          emptySelectionMessage="Nenhum responsável selecionado"
          placeholder="Buscar responsável"
          noOptionsMessage="Nenhum usuário ativo disponível."
          {...getFormFieldAriaProps("activity-owner", fieldError(state, "ownerId"), true)}
          required
        />
      </FormField>

      <fieldset className="flex flex-col gap-1.5">
        <legend
          id="activity-participants-label"
          className="text-label-md font-semibold text-on-surface"
        >
          Participantes
        </legend>
        <p className="text-body-sm leading-5 text-on-surface-variant">
          Opcional. Não precisam incluir o responsável. Usuários inativos não entram em novas
          associações.
        </p>
        <SearchableSelect
          id="activity-participants"
          name="participantIds"
          options={userSelectionOptions}
          selectedIds={participantIds}
          onSelectionChange={onParticipantSelectionChange}
          selectionLabel="participantes"
          selectionNoun="participante"
          selectionNounPlural="participantes"
          emptySelectionMessage="Nenhum participante selecionado"
          placeholder="Buscar por nome ou e-mail"
          noOptionsMessage="Nenhum usuário ativo disponível."
          multiple
          aria-labelledby="activity-participants-label"
          {...getFormFieldAriaProps("activity-participants", fieldError(state, "participantIds"))}
        />
        <FieldError
          id={fieldError(state, "participantIds") ? "activity-participants-error" : undefined}
          message={fieldError(state, "participantIds")}
        />
      </fieldset>

      <FormField
        id="activity-status"
        label="Status"
        required
        error={fieldError(state, "status")}
        description={
          mode === "edit"
            ? "Altere o status na página da atividade (mover, cancelar ou reabrir)."
            : undefined
        }
      >
        {mode === "edit" ? <input type="hidden" name="status" value={initial.status} /> : null}
        <select
          id="activity-status"
          name={mode === "edit" ? undefined : "status"}
          required={mode === "create"}
          defaultValue={initial.status}
          disabled={mode === "edit"}
          {...getFormFieldAriaProps(
            "activity-status",
            fieldError(state, "status"),
            mode === "edit",
          )}
          className={CONTROL_CLASS_NAME}
        >
          {KANBAN_COLUMN_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ACTIVITY_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="activity-start" label="Data de início" error={fieldError(state, "startDate")}>
          <input
            id="activity-start"
            name="startDate"
            type="date"
            defaultValue={initial.startDate}
            {...getFormFieldAriaProps("activity-start", fieldError(state, "startDate"))}
            className={CONTROL_CLASS_NAME}
          />
        </FormField>
        <FormField
          id="activity-end"
          label="Previsão de término"
          error={fieldError(state, "expectedEndDate")}
        >
          <input
            id="activity-end"
            name="expectedEndDate"
            type="date"
            defaultValue={initial.expectedEndDate}
            {...getFormFieldAriaProps("activity-end", fieldError(state, "expectedEndDate"))}
            className={CONTROL_CLASS_NAME}
          />
        </FormField>
      </div>

      {mode === "edit" && initial.status === ActivityStatus.DONE ? (
        <FormField
          id="activity-completed"
          label="Data de conclusão"
          error={fieldError(state, "completedDate")}
        >
          <input
            id="activity-completed"
            name="completedDate"
            type="date"
            defaultValue={initial.completedDate}
            {...getFormFieldAriaProps("activity-completed", fieldError(state, "completedDate"))}
            className={CONTROL_CLASS_NAME}
          />
        </FormField>
      ) : null}

      <FormField
        id="activity-observations"
        label="Observações"
        error={fieldError(state, "observations")}
      >
        <textarea
          id="activity-observations"
          name="observations"
          rows={3}
          defaultValue={initial.observations}
          {...getFormFieldAriaProps("activity-observations", fieldError(state, "observations"))}
          className={CONTROL_CLASS_NAME}
        />
      </FormField>

      </CollapsibleFormSection>

      <div className="sticky bottom-0 z-20 -mx-space-md flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface/95 px-space-md py-space-md backdrop-blur lg:-mx-gutter-lg lg:px-gutter-lg">
        <PrimaryButton type="submit" isLoading={pending}>
          {mode === "create" ? "Criar atividade" : "Salvar alterações"}
        </PrimaryButton>
        <Link
          href={cancelHref}
          className="rounded-lg px-3 py-2 text-label-md font-semibold text-on-surface-variant underline hover:text-on-surface"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
