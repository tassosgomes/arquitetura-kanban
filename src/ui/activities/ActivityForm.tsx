"use client";

import { useActionState, useEffect, useState } from "react";
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
import { FormField } from "@/ui/forms/FormField";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";
import { FieldError } from "@/ui/forms/FieldError";
import { CONTROL_CLASS_NAME, formatUserLabel } from "@/ui/projects/project-types";
import { useMarkFormDirty } from "@/ui/realtime/useProtectOpenEdit";
import type {
  ActivityFormValues,
  ActivityProjectOption,
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
};

type FormState = ActionResult<ActivityRecord> | null;

function fieldError(state: FormState, field: string): string | undefined {
  if (!state || state.ok) {
    return undefined;
  }
  return state.error.fields?.[field]?.[0];
}

function applyPrefill(
  option: ActivityProjectOption | undefined,
  setters: {
    setOwnerId: (value: string) => void;
    setParticipantIds: (value: string[]) => void;
    setNature: (value: string) => void;
    setArchitectureRole: (value: string) => void;
    setRequestingAreaId: (value: string) => void;
  },
) {
  if (!option) {
    return;
  }
  setters.setOwnerId(option.defaults.ownerId);
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
}: ActivityFormProps) {
  const router = useRouter();
  const { formProps } = useMarkFormDirty();
  const [type, setType] = useState(initial.type);
  const [projectId, setProjectId] = useState(initial.projectId);
  const [ownerId, setOwnerId] = useState(initial.ownerId);
  const [participantIds, setParticipantIds] = useState(initial.participantIds);
  const [nature, setNature] = useState(initial.nature);
  const [architectureRole, setArchitectureRole] = useState(initial.architectureRole);
  const [requestingAreaId, setRequestingAreaId] = useState(initial.requestingAreaId);

  const ownerInactive = users.some((user) => user.id === ownerId && !user.isActive);
  const areaInactive = areas.some((area) => area.id === requestingAreaId && !area.isActive);
  const domainInactive = domains.some(
    (domain) => domain.id === initial.domainId && !domain.isActive,
  );

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

  const conflict = Boolean(state && !state.ok && state.error.code === "CONFLICT");
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
      applyPrefill(projects.find((project) => project.id === nextId), {
        setOwnerId,
        setParticipantIds,
        setNature,
        setArchitectureRole,
        setRequestingAreaId,
      });
    }
  }

  function toggleParticipant(userId: string, checked: boolean) {
    setParticipantIds((current) =>
      checked ? [...new Set([...current, userId])] : current.filter((id) => id !== userId),
    );
  }

  return (
    <form action={submit} className="flex max-w-2xl flex-col gap-5" noValidate {...formProps}>
      {mode === "edit" && initial.id ? (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="version" value={initial.version ?? 1} />
        </>
      ) : null}

      {conflict ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">
          <p>{state && !state.ok ? state.error.message : null}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-2 font-medium underline"
          >
            Recarregar os dados
          </button>
        </div>
      ) : null}

      {globalError ? (
        <p className="text-sm text-red-700" role="alert">
          {globalError}
        </p>
      ) : null}

      <FormField id="activity-title" label="Título" required error={fieldError(state, "title")}>
        <input
          id="activity-title"
          name="title"
          type="text"
          required
          defaultValue={initial.title}
          aria-invalid={Boolean(fieldError(state, "title"))}
          className={CONTROL_CLASS_NAME}
        />
      </FormField>

      <FormField id="activity-description" label="Descrição" error={fieldError(state, "description")}>
        <textarea
          id="activity-description"
          name="description"
          rows={4}
          defaultValue={initial.description}
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
          onChange={(event) => setRequestingAreaId(event.target.value)}
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
        <legend className="text-sm font-medium text-zinc-900">Áreas envolvidas</legend>
        <p className="text-sm leading-5 text-zinc-600">
          Opcional. Áreas inativas não entram em novas associações; as já vinculadas podem ser
          mantidas.
        </p>
        {areas.length === 0 ? (
          <p className="text-sm text-zinc-600">Nenhuma área disponível.</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white p-3">
            {areas.map((area) => (
              <li key={area.id} className="flex items-start gap-2 py-1">
                <input
                  id={`involved-${area.id}`}
                  name="involvedAreaIds"
                  type="checkbox"
                  value={area.id}
                  defaultChecked={initial.involvedAreaIds.includes(area.id)}
                  disabled={!area.isActive && !initial.involvedAreaIds.includes(area.id)}
                  className="mt-1"
                />
                <label htmlFor={`involved-${area.id}`} className="text-sm text-zinc-800">
                  {area.name}
                  {area.isActive ? null : " (inativa)"}
                </label>
              </li>
            ))}
          </ul>
        )}
        <FieldError
          id={fieldError(state, "involvedAreaIds") ? "activity-involved-error" : undefined}
          message={fieldError(state, "involvedAreaIds")}
        />
      </fieldset>

      <FormField
        id="activity-domain"
        label="Domínio"
        required
        error={fieldError(state, "domainId")}
        description={
          domainInactive
            ? "O domínio atual está inativo. Selecione um domínio ativo para salvar."
            : undefined
        }
      >
        <select
          id="activity-domain"
          name="domainId"
          required
          defaultValue={initial.domainId}
          className={CONTROL_CLASS_NAME}
        >
          <option value="">Selecione um domínio</option>
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.isActive ? domain.name : `${domain.name} (inativo)`}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="activity-nature" label="Natureza" required error={fieldError(state, "nature")}>
        <select
          id="activity-nature"
          name="nature"
          required
          value={nature}
          onChange={(event) => setNature(event.target.value)}
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
      >
        <select
          id="activity-role"
          name="architectureRole"
          required
          value={architectureRole}
          onChange={(event) => setArchitectureRole(event.target.value)}
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
        <select
          id="activity-owner"
          name="ownerId"
          required
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
          className={CONTROL_CLASS_NAME}
        >
          <option value="">Selecione um responsável</option>
          {users
            .filter((user) => user.isActive || user.id === ownerId)
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.isActive ? formatUserLabel(user) : `${formatUserLabel(user)} (inativo)`}
              </option>
            ))}
        </select>
      </FormField>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-zinc-900">Participantes</legend>
        <p className="text-sm leading-5 text-zinc-600">
          Opcional. Não precisam incluir o responsável. Usuários inativos não entram em novas
          associações.
        </p>
        {users.length === 0 ? (
          <p className="text-sm text-zinc-600">Nenhum usuário disponível.</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white p-3">
            {users.map((user) => (
              <li key={user.id} className="flex items-start gap-2 py-1">
                <input
                  id={`participant-${user.id}`}
                  name="participantIds"
                  type="checkbox"
                  value={user.id}
                  checked={participantIds.includes(user.id)}
                  onChange={(event) => toggleParticipant(user.id, event.target.checked)}
                  disabled={!user.isActive && !initial.participantIds.includes(user.id)}
                  className="mt-1"
                />
                <label htmlFor={`participant-${user.id}`} className="text-sm text-zinc-800">
                  {formatUserLabel(user)}
                  {user.isActive ? null : " (inativo)"}
                </label>
              </li>
            ))}
          </ul>
        )}
        <FieldError
          id={fieldError(state, "participantIds") ? "activity-participants-error" : undefined}
          message={fieldError(state, "participantIds")}
        />
      </fieldset>

      <FormField
        id="activity-priority"
        label="Prioridade"
        required
        error={fieldError(state, "priority")}
      >
        <select
          id="activity-priority"
          name="priority"
          required
          defaultValue={initial.priority}
          className={CONTROL_CLASS_NAME}
        >
          {Object.values(Priority).map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="activity-effort" label="Esforço" error={fieldError(state, "effort")}>
        <select
          id="activity-effort"
          name="effort"
          defaultValue={initial.effort}
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
          className={CONTROL_CLASS_NAME}
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" isLoading={pending}>
          {mode === "create" ? "Criar atividade" : "Salvar alterações"}
        </PrimaryButton>
        <Link
          href={cancelHref}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
