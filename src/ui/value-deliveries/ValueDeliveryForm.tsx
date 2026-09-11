"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ActionResult } from "@/app/actions/action-result";
import type { ValueDeliveryRecord } from "@/application/value-deliveries";
import { FormField } from "@/ui/forms/FormField";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";
import { CONTROL_CLASS_NAME } from "@/ui/projects/project-types";
import { MarkdownEditor } from "@/ui/markdown/MarkdownEditor";
import { useMarkFormDirty, useProtectOpenEdit } from "@/ui/realtime/useProtectOpenEdit";

type ValueDeliveryFormProps = {
  mode: "create" | "edit";
  projectId: string;
  action: (input: unknown) => Promise<ActionResult<ValueDeliveryRecord>>;
  initial: {
    id?: string;
    version?: number;
    title: string;
    contentMarkdown: string;
    referenceDate: string;
  };
  cancelHref: string;
};

type FormState = ActionResult<ValueDeliveryRecord> | null;

function fieldError(state: FormState, field: string): string | undefined {
  if (!state || state.ok) {
    return undefined;
  }
  return state.error.fields?.[field]?.[0];
}

function readForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    contentMarkdown: String(formData.get("contentMarkdown") ?? ""),
    referenceDate: String(formData.get("referenceDate") ?? ""),
    projectId: String(formData.get("projectId") ?? ""),
    id: String(formData.get("id") ?? ""),
    version: Number(formData.get("version") ?? 0),
  };
}

export function ValueDeliveryForm({
  mode,
  projectId,
  action,
  initial,
  cancelHref,
}: ValueDeliveryFormProps) {
  const router = useRouter();
  const { formProps, markDirty } = useMarkFormDirty();
  const [content, setContent] = useState(initial.contentMarkdown);
  useProtectOpenEdit(content !== initial.contentMarkdown);

  const [state, submit, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const values = readForm(formData);
      if (mode === "create") {
        return action({
          projectId: values.projectId,
          title: values.title,
          contentMarkdown: values.contentMarkdown,
          referenceDate: values.referenceDate,
        });
      }
      return action({
        id: values.id,
        version: values.version,
        title: values.title,
        contentMarkdown: values.contentMarkdown,
        referenceDate: values.referenceDate,
      });
    },
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push(`/projects/${projectId}/value-deliveries/${state.data.id}`);
      router.refresh();
    }
  }, [state, router, projectId]);

  const conflict = Boolean(state && !state.ok && state.error.code === "CONFLICT");
  const globalError =
    state && !state.ok && !conflict && !state.error.fields
      ? state.error.message
      : state && !state.ok && !conflict && state.error.fields && Object.keys(state.error.fields).length === 0
        ? state.error.message
        : undefined;

  return (
    <form action={submit} className="flex max-w-3xl flex-col gap-5" noValidate {...formProps}>
      <input type="hidden" name="projectId" value={projectId} />
      {mode === "edit" && initial.id ? (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="version" value={initial.version ?? 1} />
        </>
      ) : null}
      <input type="hidden" name="contentMarkdown" value={content} />

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

      <FormField id="delivery-title" label="Título" required error={fieldError(state, "title")}>
        <input
          id="delivery-title"
          name="title"
          type="text"
          required
          defaultValue={initial.title}
          aria-invalid={Boolean(fieldError(state, "title"))}
          aria-describedby={fieldError(state, "title") ? "delivery-title-error" : undefined}
          className={CONTROL_CLASS_NAME}
        />
      </FormField>

      <FormField
        id="delivery-reference-date"
        label="Data de referência"
        required
        error={fieldError(state, "referenceDate")}
      >
        <input
          id="delivery-reference-date"
          name="referenceDate"
          type="date"
          required
          defaultValue={initial.referenceDate}
          aria-invalid={Boolean(fieldError(state, "referenceDate"))}
          aria-describedby={
            fieldError(state, "referenceDate") ? "delivery-reference-date-error" : undefined
          }
          className={CONTROL_CLASS_NAME}
        />
      </FormField>

      <FormField
        id="contentMarkdown"
        label="Conteúdo Markdown"
        required
        error={fieldError(state, "contentMarkdown")}
        description="Use Markdown. HTML, scripts e URLs perigosas não são executados na visualização."
      >
        <MarkdownEditor
          id="contentMarkdown"
          value={content}
          onChange={(next) => {
            markDirty();
            setContent(next);
          }}
          invalid={Boolean(fieldError(state, "contentMarkdown"))}
        />
      </FormField>

      <div className="flex flex-wrap gap-3">
        <PrimaryButton type="submit" isLoading={pending}>
          {mode === "create" ? "Criar entrega" : "Salvar alterações"}
        </PrimaryButton>
        <Link
          href={cancelHref}
          className="inline-flex items-center rounded-lg px-4 py-2.5 text-label-md font-semibold text-on-surface-variant underline hover:text-on-surface"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
