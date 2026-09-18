"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createActivityAction,
  loadQuickActivityCreateContextAction,
  type QuickActivityCreateContext,
} from "@/app/actions/activities";
import type { ActionErrorPayload } from "@/app/actions/action-result";
import type { ActivityRecord } from "@/application/activities";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import {
  ACTIVITY_NATURE_LABELS,
  ARCHITECTURE_ROLE_LABELS,
  ArchitectureRole,
  Nature,
  Priority,
} from "@/domain/catalog/classifications";
import { formatUserLabel } from "@/ui/projects/project-types";

const QUICK_CREATE_ERROR_FIELDS = [
  { field: "title", label: "Título" },
  { field: "ownerId", label: "Responsável" },
  { field: "requestingAreaId", label: "Área solicitante" },
  { field: "domainId", label: "Categoria" },
] as const;

export type QuickActivityCreateDraft = {
  optimisticId: string;
  title: string;
  status: ActivityStatus;
  owner: QuickActivityCreateContext["users"][number];
  requestingArea: QuickActivityCreateContext["areas"][number];
};

export type KanbanQuickCreateSlots = {
  trigger: ReactNode;
  form: ReactNode;
};

type KanbanQuickCreateProps = {
  columnLabel: string;
  status: ActivityStatus;
  disabled?: boolean;
  onOptimisticCreate: (draft: QuickActivityCreateDraft) => void;
  onCreateSuccess: (optimisticId: string, activity: ActivityRecord) => void;
  onCreateFailure: (optimisticId: string) => void;
  children: (slots: KanbanQuickCreateSlots) => ReactNode;
};

function fieldError(error: ActionErrorPayload | null, field: string): string | undefined {
  return error?.fields?.[field]?.[0];
}

function newOptimisticId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `optimistic-${crypto.randomUUID()}`;
  }
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function KanbanQuickCreate({
  columnLabel,
  status,
  disabled = false,
  onOptimisticCreate,
  onCreateSuccess,
  onCreateFailure,
  children,
}: KanbanQuickCreateProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<QuickActivityCreateContext | null>(null);
  const [contextError, setContextError] = useState<ActionErrorPayload | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [requestingAreaId, setRequestingAreaId] = useState("");
  const [domainId, setDomainId] = useState("");
  const [submitError, setSubmitError] = useState<ActionErrorPayload | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const formId = useId().replaceAll(":", "");

  const busy = disabled || loadingContext || isPending;
  const titleId = `${formId}-title`;
  const ownerIdControl = `${formId}-owner`;
  const areaIdControl = `${formId}-area`;
  const domainIdControl = `${formId}-domain`;

  function resetFields() {
    setTitle("");
    setOwnerId(context?.actorId ?? "");
    setRequestingAreaId("");
    setDomainId("");
    setSubmitError(null);
  }

  function closeForm() {
    setIsOpen(false);
    setContextError(null);
    resetFields();
    triggerRef.current?.focus();
  }

  function loadContext() {
    if (loadingContext) {
      return;
    }

    setLoadingContext(true);
    setContextError(null);
    startTransition(async () => {
      try {
        const result = await loadQuickActivityCreateContextAction();
        if (result.ok) {
          setContext(result.data);
          setOwnerId(result.data.actorId);
        } else {
          setContextError(result.error);
        }
      } catch {
        setContextError({
          code: "UNKNOWN",
          message: "Não foi possível carregar as opções. Tente novamente.",
        });
      } finally {
        setLoadingContext(false);
      }
    });
  }

  function openForm() {
    if (disabled) {
      return;
    }
    setIsOpen(true);
    setSubmitError(null);
    if (!context) {
      loadContext();
    }
  }

  useEffect(() => {
    if (isOpen && context && !isPending) {
      titleRef.current?.focus();
    }
  }, [context, isOpen, isPending]);

  useEffect(() => {
    if (!submitError) {
      return;
    }
    const firstField = QUICK_CREATE_ERROR_FIELDS.find((entry) =>
      Boolean(fieldError(submitError, entry.field)),
    );
    if (!firstField) {
      return;
    }
    const controlId =
      firstField.field === "title"
        ? titleId
        : firstField.field === "ownerId"
          ? ownerIdControl
          : firstField.field === "requestingAreaId"
            ? areaIdControl
            : domainIdControl;
    document.getElementById(controlId)?.focus();
  }, [areaIdControl, domainIdControl, ownerIdControl, submitError, titleId]);

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeForm();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context || busy) {
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const shouldDetail = submitter instanceof HTMLButtonElement && submitter.dataset.intent === "detail";
    const optimisticId = newOptimisticId();
    const owner = context.users.find((user) => user.id === ownerId);
    const requestingArea = context.areas.find((area) => area.id === requestingAreaId);

    if (owner && requestingArea) {
      onOptimisticCreate({
        optimisticId,
        title: title.trim(),
        status,
        owner,
        requestingArea,
      });
    }

    setSubmitError(null);
    startTransition(async () => {
      try {
        const result = await createActivityAction({
          title,
          description: "",
          observations: "",
          type: ActivityType.AD_HOC,
          projectId: "",
          requestingAreaId,
          domainId,
          nature: Nature.OPERATIONAL,
          architectureRole: ArchitectureRole.RESPONSIBLE,
          ownerId,
          participantIds: [],
          involvedAreaIds: [],
          priority: Priority.MEDIUM,
          effort: "",
          status,
          startDate: "",
          expectedEndDate: "",
          completedDate: "",
        });

        if (!result.ok) {
          onCreateFailure(optimisticId);
          setSubmitError(result.error);
          return;
        }

        onCreateSuccess(optimisticId, result.data);
        closeForm();
        if (shouldDetail) {
          router.push(`/activities/${result.data.id}/edit`);
        }
      } catch {
        onCreateFailure(optimisticId);
        setSubmitError({
          code: "UNKNOWN",
          message: "Não foi possível criar a atividade. Tente novamente.",
        });
      }
    });
  }

  const fieldsWithErrors = QUICK_CREATE_ERROR_FIELDS.flatMap((entry) => {
    const message = fieldError(submitError, entry.field);
    return message ? [{ ...entry, message }] : [];
  });

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Nova atividade em ${columnLabel}`}
      aria-expanded={isOpen}
      aria-controls={isOpen ? `${formId}-form` : undefined}
      disabled={disabled}
      onClick={openForm}
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        add
      </span>
    </button>
  );

  const form = isOpen ? (
    <form
      id={`${formId}-form`}
      className="flex flex-col gap-3 rounded-xl border border-outline-variant/60 bg-surface-container p-space-sm shadow-sm"
      aria-label={`Criar atividade em ${columnLabel}`}
      aria-busy={busy || undefined}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-label-md font-semibold text-on-surface">Nova atividade</h3>
          <p className="text-body-sm text-on-surface-variant">{columnLabel}</p>
        </div>
        <button
          type="button"
          className="rounded-md px-1.5 py-1 text-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Cancelar criação"
          disabled={isPending}
          onClick={closeForm}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {contextError ? (
        <div className="flex flex-col gap-2 rounded-lg border border-error/40 bg-error-container/40 p-2 text-body-sm text-on-error-container" role="alert">
          <p>{contextError.message}</p>
          <button
            type="button"
            className="self-start font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            disabled={busy}
            onClick={loadContext}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {loadingContext ? (
        <p className="text-body-sm text-on-surface-variant" role="status" aria-live="polite">
          Carregando opções…
        </p>
      ) : null}

      {submitError ? (
        <div
          className="flex flex-col gap-1 rounded-lg border border-error/40 bg-error-container p-2 text-body-sm text-on-error-container"
          role="alert"
          aria-live="assertive"
        >
          <p>{submitError.message}</p>
          {fieldsWithErrors.length > 0 ? (
            <ul className="list-disc pl-4">
              {fieldsWithErrors.map((entry) => (
                <li key={entry.field}>
                  {entry.label}: {entry.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <fieldset className="flex flex-col gap-3" disabled={busy || !context}>
        <legend className="sr-only">Dados mínimos da atividade</legend>
        <label className="flex flex-col gap-1 text-label-sm font-semibold text-on-surface" htmlFor={titleId}>
          Título
          <input
            ref={titleRef}
            id={titleId}
            name="title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(fieldError(submitError, "title"))}
            aria-describedby={fieldError(submitError, "title") ? `${titleId}-error` : undefined}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-2 text-body-md font-normal text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          {fieldError(submitError, "title") ? (
            <span id={`${titleId}-error`} className="font-normal text-error">
              {fieldError(submitError, "title")}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-label-sm font-semibold text-on-surface" htmlFor={ownerIdControl}>
          Responsável
          <select
            id={ownerIdControl}
            name="ownerId"
            required
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            aria-invalid={Boolean(fieldError(submitError, "ownerId"))}
            aria-describedby={fieldError(submitError, "ownerId") ? `${ownerIdControl}-error` : undefined}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-2 text-body-md font-normal text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <option value="">Selecione</option>
            {context?.users.map((user) => (
              <option key={user.id} value={user.id}>
                {formatUserLabel(user)}
              </option>
            ))}
          </select>
          {fieldError(submitError, "ownerId") ? (
            <span id={`${ownerIdControl}-error`} className="font-normal text-error">
              {fieldError(submitError, "ownerId")}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-label-sm font-semibold text-on-surface" htmlFor={areaIdControl}>
          Área solicitante
          <select
            id={areaIdControl}
            name="requestingAreaId"
            required
            value={requestingAreaId}
            onChange={(event) => setRequestingAreaId(event.target.value)}
            aria-invalid={Boolean(fieldError(submitError, "requestingAreaId"))}
            aria-describedby={fieldError(submitError, "requestingAreaId") ? `${areaIdControl}-error` : undefined}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-2 text-body-md font-normal text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <option value="">Selecione</option>
            {context?.areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          {fieldError(submitError, "requestingAreaId") ? (
            <span id={`${areaIdControl}-error`} className="font-normal text-error">
              {fieldError(submitError, "requestingAreaId")}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-label-sm font-semibold text-on-surface" htmlFor={domainIdControl}>
          Categoria
          <select
            id={domainIdControl}
            name="domainId"
            required
            value={domainId}
            onChange={(event) => setDomainId(event.target.value)}
            aria-invalid={Boolean(fieldError(submitError, "domainId"))}
            aria-describedby={fieldError(submitError, "domainId") ? `${domainIdControl}-error` : undefined}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-2 text-body-md font-normal text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <option value="">Selecione</option>
            {context?.domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
          {fieldError(submitError, "domainId") ? (
            <span id={`${domainIdControl}-error`} className="font-normal text-error">
              {fieldError(submitError, "domainId")}
            </span>
          ) : null}
        </label>

        {/*
          O texto precisa dizer o que de fato é gravado: natureza e papel são
          obrigatórios no schema, então a criação rápida envia um valor inicial em vez
          de deixá-los pendentes. Anunciar os três como "pendentes" escondia que dois
          deles entram no banco, na auditoria e nos relatórios que agregam por
          classificação, indistinguíveis de uma escolha deliberada.
        */}
        <p className="rounded-lg bg-surface-container-low px-2.5 py-2 text-body-sm leading-5 text-on-surface-variant">
          Esforço fica pendente. Natureza e papel da Arquitetura entram como{" "}
          <span className="font-semibold text-on-surface">
            {ACTIVITY_NATURE_LABELS[Nature.OPERATIONAL]}
          </span>{" "}
          e{" "}
          <span className="font-semibold text-on-surface">
            {ARCHITECTURE_ROLE_LABELS[ArchitectureRole.RESPONSIBLE]}
          </span>{" "}
          e precisam de revisão. Ajuste os três em
          <span className="font-semibold text-on-surface"> Editar</span> no detalhe da atividade.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-2 text-label-sm font-semibold text-on-primary shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !context}
          >
            {isPending ? "Criando…" : "Criar"}
          </button>
          <button
            type="submit"
            data-intent="detail"
            className="rounded-lg border border-outline-variant px-3 py-2 text-label-sm font-semibold text-on-surface hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !context}
          >
            Criar e detalhar
          </button>
          <button
            type="button"
            className="rounded-lg px-2 py-2 text-label-sm font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            disabled={isPending}
            onClick={closeForm}
          >
            Cancelar
          </button>
        </div>
      </fieldset>
    </form>
  ) : null;

  return children({ trigger, form });
}
