"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/actions/action-result";
import type { CatalogItem } from "@/application/catalogs";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { FormField } from "@/ui/forms/FormField";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";
import type { CatalogItemDto } from "@/ui/catalogs/catalog-types";
import { useMarkFormDirty, useProtectOpenEdit } from "@/ui/realtime/useProtectOpenEdit";

type CatalogActions = {
  create: (input: { name: string }) => Promise<ActionResult<CatalogItem>>;
  rename: (input: { id: string; name: string }) => Promise<ActionResult<CatalogItem>>;
  deactivate: (input: { id: string }) => Promise<ActionResult<CatalogItem>>;
};

type CatalogManagerProps = {
  items: CatalogItemDto[];
  labels: {
    singular: string;
    plural: string;
    createHeading: string;
    emptyTitle: string;
    emptyMessage: string;
  };
  actions: CatalogActions;
};

type FormState = ActionResult<CatalogItem> | null;

const initialState: FormState = null;

function fieldError(state: FormState, field: string): string | undefined {
  if (!state || state.ok) {
    return undefined;
  }
  return state.error.fields?.[field]?.[0];
}

export function CatalogManager({ items, labels, actions }: CatalogManagerProps) {
  const router = useRouter();
  const { formProps } = useMarkFormDirty();
  const [editingId, setEditingId] = useState<string | null>(null);
  useProtectOpenEdit(editingId !== null);

  const [createState, createSubmit, createPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const name = String(formData.get("name") ?? "");
      return actions.create({ name });
    },
    initialState,
  );

  const [renameState, renameSubmit, renamePending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const id = String(formData.get("id") ?? "");
      const name = String(formData.get("name") ?? "");
      const result = await actions.rename({ id, name });
      if (result.ok) {
        setEditingId(null);
      }
      return result;
    },
    initialState,
  );

  const [deactivateState, deactivateSubmit, deactivatePending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const id = String(formData.get("id") ?? "");
      return actions.deactivate({ id });
    },
    initialState,
  );

  useEffect(() => {
    if (createState?.ok || renameState?.ok || deactivateState?.ok) {
      router.refresh();
    }
  }, [createState, renameState, deactivateState, router]);

  const globalError =
    (createState && !createState.ok ? createState.error.message : undefined) ??
    (renameState && !renameState.ok && !renameState.error.fields?.name
      ? renameState.error.message
      : undefined) ??
    (deactivateState && !deactivateState.ok ? deactivateState.error.message : undefined);

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="catalog-create-title"
        className="max-w-xl rounded-lg border border-zinc-200 bg-white p-4"
      >
        <h2 id="catalog-create-title" className="text-sm font-semibold text-zinc-900">
          {labels.createHeading}
        </h2>
        <form action={createSubmit} className="mt-4 flex flex-col gap-4" noValidate {...formProps}>
          <FormField
            id="catalog-create-name"
            label={`Nome da ${labels.singular}`}
            required
            error={fieldError(createState, "name")}
          >
            <input
              id="catalog-create-name"
              name="name"
              type="text"
              required
              aria-invalid={Boolean(fieldError(createState, "name"))}
              aria-describedby={
                fieldError(createState, "name") ? "catalog-create-name-error" : undefined
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            />
          </FormField>
          <PrimaryButton type="submit" isLoading={createPending}>
            Criar {labels.singular}
          </PrimaryButton>
        </form>
      </section>

      {globalError ? (
        <p className="text-sm text-red-700" role="alert">{globalError}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title={labels.emptyTitle} message={labels.emptyMessage} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Lista de {labels.plural}</caption>
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Nome</th>
                <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => {
                const isEditing = editingId === item.id;
                const renameError =
                  isEditing && renameState && !renameState.ok
                    ? fieldError(renameState, "name")
                    : undefined;

                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <form action={renameSubmit} className="flex flex-col gap-2">
                          <input type="hidden" name="id" value={item.id} />
                          <FormField
                            id={`rename-${item.id}`}
                            label={`Renomear ${labels.singular}`}
                            required
                            error={renameError}
                          >
                            <input
                              id={`rename-${item.id}`}
                              name="name"
                              type="text"
                              defaultValue={item.name}
                              required
                              aria-invalid={Boolean(renameError)}
                              className="w-full min-w-[12rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                            />
                          </FormField>
                          <div className="flex flex-wrap gap-2">
                            <PrimaryButton type="submit" isLoading={renamePending}>
                              Salvar
                            </PrimaryButton>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <span className="font-medium text-zinc-900">{item.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {item.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(item.id)}
                            className="rounded-md px-2 py-1 text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
                          >
                            Renomear
                          </button>
                          {item.isActive ? (
                            <form action={deactivateSubmit}>
                              <input type="hidden" name="id" value={item.id} />
                              <button
                                type="submit"
                                disabled={deactivatePending}
                                className="rounded-md px-2 py-1 text-sm font-medium text-red-800 underline hover:text-red-900 disabled:opacity-50"
                              >
                                Inativar
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
