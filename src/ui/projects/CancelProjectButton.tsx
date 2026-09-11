"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/actions/action-result";
import type { ProjectRecord } from "@/application/projects";

type CancelProjectButtonProps = {
  projectId: string;
  version: number;
  action: (input: { id: string; version: number }) => Promise<ActionResult<ProjectRecord>>;
};

type FormState = ActionResult<ProjectRecord> | null;

export function CancelProjectButton({ projectId, version, action }: CancelProjectButtonProps) {
  const router = useRouter();
  const [state, submit, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const confirmed = window.confirm(
        "Cancelar este projeto? O registro permanece visível, mas não poderá ser editado.",
      );
      if (!confirmed) {
        return _prev;
      }
      return action({
        id: String(formData.get("id") ?? ""),
        version: Number(formData.get("version") ?? 0),
      });
    },
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={submit} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={projectId} />
      <input type="hidden" name="version" value={version} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md px-2 py-1 text-sm font-medium text-red-800 underline hover:text-red-900 disabled:opacity-50"
      >
        {pending ? "Cancelando…" : "Cancelar projeto"}
      </button>
      {state && !state.ok ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error.message}
        </p>
      ) : null}
    </form>
  );
}
