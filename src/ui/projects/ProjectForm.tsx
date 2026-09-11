"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ActionResult } from "@/app/actions/action-result";
import type { ProjectRecord } from "@/application/projects";
import {
  ARCHITECTURE_ROLE_LABELS,
  ArchitectureRole,
  NATURE_LABELS,
  Nature,
} from "@/domain/catalog/classifications";
import { PROJECT_STATUS_LABELS, ProjectStatus } from "@/domain/project/project-status";
import { FormField } from "@/ui/forms/FormField";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";
import { FieldError } from "@/ui/forms/FieldError";
import {
  CONTROL_CLASS_NAME,
  formatUserLabel,
  type ProjectFormValues,
  type ProjectOption,
  type ProjectUserOption,
} from "@/ui/projects/project-types";

type ProjectFormProps = {
  mode: "create" | "edit";
  action: (input: unknown) => Promise<ActionResult<ProjectRecord>>;
  areas: ProjectOption[];
  users: ProjectUserOption[];
  initial: ProjectFormValues;
  cancelHref: string;
};

type FormState = ActionResult<ProjectRecord> | null;

const CREATE_STATUSES = [
  ProjectStatus.PLANNED,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.COMPLETED,
  ProjectStatus.CANCELLED,
] as const;

const EDIT_STATUSES = [
  ProjectStatus.PLANNED,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.COMPLETED,
] as const;

function fieldError(state: FormState, field: string): string | undefined {
  if (!state || state.ok) {
    return undefined;
  }
  return state.error.fields?.[field]?.[0];
}

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    responsibleAreaId: String(formData.get("responsibleAreaId") ?? ""),
    externalResponsible: String(formData.get("externalResponsible") ?? ""),
    architectureOwnerId: String(formData.get("architectureOwnerId") ?? ""),
    participantIds: formData.getAll("participantIds").map(String).filter(Boolean),
    architectureRole: String(formData.get("architectureRole") ?? ""),
    nature: String(formData.get("nature") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    expectedEndDate: String(formData.get("expectedEndDate") ?? ""),
    status: String(formData.get("status") ?? ""),
    id: String(formData.get("id") ?? ""),
    version: Number(formData.get("version") ?? 0),
  };
}

export function ProjectForm({
  mode,
  action,
  areas,
  users,
  initial,
  cancelHref,
}: ProjectFormProps) {
  const router = useRouter();
  const statuses = mode === "create" ? CREATE_STATUSES : EDIT_STATUSES;
  const ownerInactive = users.some(
    (user) => user.id === initial.architectureOwnerId && !user.isActive,
  );
  const areaInactive = areas.some(
    (area) => area.id === initial.responsibleAreaId && !area.isActive,
  );

  const [state, submit, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const values = readForm(formData);
      if (mode === "create") {
        return action({
          name: values.name,
          description: values.description,
          responsibleAreaId: values.responsibleAreaId,
          externalResponsible: values.externalResponsible,
          architectureOwnerId: values.architectureOwnerId,
          participantIds: values.participantIds,
          architectureRole: values.architectureRole,
          nature: values.nature,
          startDate: values.startDate,
          expectedEndDate: values.expectedEndDate,
          status: values.status,
        });
      }
      return action(values);
    },
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push(`/projects/${state.data.id}`);
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

  return (
    <form action={submit} className="flex max-w-2xl flex-col gap-5" noValidate>
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

      <FormField id="project-name" label="Nome" required error={fieldError(state, "name")}>
        <input
          id="project-name"
          name="name"
          type="text"
          required
          defaultValue={initial.name}
          aria-invalid={Boolean(fieldError(state, "name"))}
          aria-describedby={fieldError(state, "name") ? "project-name-error" : undefined}
          className={CONTROL_CLASS_NAME}
        />
      </FormField>

      <FormField id="project-description" label="Descrição" error={fieldError(state, "description")}>
        <textarea
          id="project-description"
          name="description"
          rows={4}
          defaultValue={initial.description}
          aria-invalid={Boolean(fieldError(state, "description"))}
          className={CONTROL_CLASS_NAME}
        />
      </FormField>

      <FormField
        id="project-area"
        label="Área responsável"
        required
        error={fieldError(state, "responsibleAreaId")}
        description={
          areaInactive
            ? "A área atual está inativa. Selecione uma área ativa para salvar."
            : undefined
        }
      >
        <select
          id="project-area"
          name="responsibleAreaId"
          required
          defaultValue={initial.responsibleAreaId}
          aria-invalid={Boolean(fieldError(state, "responsibleAreaId"))}
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

      <FormField
        id="project-owner"
        label="Responsável Arquitetura"
        required
        error={fieldError(state, "architectureOwnerId")}
        description={
          ownerInactive
            ? "O responsável atual está inativo. Reatribua para um usuário ativo para salvar."
            : undefined
        }
      >
        <select
          id="project-owner"
          name="architectureOwnerId"
          required
          defaultValue={initial.architectureOwnerId}
          aria-invalid={Boolean(fieldError(state, "architectureOwnerId"))}
          className={CONTROL_CLASS_NAME}
        >
          <option value="">Selecione um responsável</option>
          {users
            .filter((user) => user.isActive || user.id === initial.architectureOwnerId)
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.isActive
                  ? formatUserLabel(user)
                  : `${formatUserLabel(user)} (inativo)`}
              </option>
            ))}
        </select>
      </FormField>

      <FormField
        id="project-external"
        label="Responsável externo"
        error={fieldError(state, "externalResponsible")}
      >
        <input
          id="project-external"
          name="externalResponsible"
          type="text"
          defaultValue={initial.externalResponsible}
          className={CONTROL_CLASS_NAME}
        />
      </FormField>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-zinc-900">Participantes</legend>
        <p className="text-sm leading-5 text-zinc-600">
          Opcional. Usuários inativos não entram em novas associações; participantes já vinculados
          podem ser mantidos.
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
                  defaultChecked={initial.participantIds.includes(user.id)}
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
          id={fieldError(state, "participantIds") ? "project-participants-error" : undefined}
          message={fieldError(state, "participantIds")}
        />
      </fieldset>

      <FormField
        id="project-role"
        label="Papel da Arquitetura"
        required
        error={fieldError(state, "architectureRole")}
      >
        <select
          id="project-role"
          name="architectureRole"
          required
          defaultValue={initial.architectureRole}
          className={CONTROL_CLASS_NAME}
        >
          {Object.values(ArchitectureRole).map((role) => (
            <option key={role} value={role}>
              {ARCHITECTURE_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="project-nature" label="Natureza" required error={fieldError(state, "nature")}>
        <select
          id="project-nature"
          name="nature"
          required
          defaultValue={initial.nature}
          className={CONTROL_CLASS_NAME}
        >
          {Object.values(Nature).map((nature) => (
            <option key={nature} value={nature}>
              {NATURE_LABELS[nature]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="project-status" label="Status" required error={fieldError(state, "status")}>
        <select
          id="project-status"
          name="status"
          required
          defaultValue={initial.status}
          className={CONTROL_CLASS_NAME}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {PROJECT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="project-start" label="Data de início" error={fieldError(state, "startDate")}>
          <input
            id="project-start"
            name="startDate"
            type="date"
            defaultValue={initial.startDate}
            className={CONTROL_CLASS_NAME}
          />
        </FormField>
        <FormField
          id="project-end"
          label="Previsão de término"
          error={fieldError(state, "expectedEndDate")}
        >
          <input
            id="project-end"
            name="expectedEndDate"
            type="date"
            defaultValue={initial.expectedEndDate}
            className={CONTROL_CLASS_NAME}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton type="submit" isLoading={pending}>
          {mode === "create" ? "Criar projeto" : "Salvar alterações"}
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
