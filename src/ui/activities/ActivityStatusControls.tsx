"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/actions/action-result";
import type { ActivityRecord } from "@/application/activities";
import {
  ACTIVITY_STATUS_LABELS,
  ActivityStatus,
  KANBAN_COLUMN_STATUSES,
} from "@/domain/activity/enums";
import { CONTROL_CLASS_NAME } from "@/ui/projects/project-types";

type ActivityStatusControlsProps = {
  activityId: string;
  version: number;
  status: ActivityStatus;
  action: (input: {
    id: string;
    version: number;
    status?: ActivityStatus;
  }) => Promise<ActionResult<ActivityRecord>>;
};

type FormState = ActionResult<ActivityRecord> | null;

function moveTargets(status: ActivityStatus): readonly ActivityStatus[] {
  if (status === ActivityStatus.DONE) {
    return KANBAN_COLUMN_STATUSES.filter((value) => value !== ActivityStatus.DONE);
  }
  return KANBAN_COLUMN_STATUSES;
}

export function ActivityStatusControls({
  activityId,
  version,
  status,
  action,
}: ActivityStatusControlsProps) {
  const router = useRouter();
  const [state, submit, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const intent = String(formData.get("intent") ?? "");
      const payload: { id: string; version: number; status?: ActivityStatus } = {
        id: String(formData.get("id") ?? ""),
        version: Number(formData.get("version") ?? 0),
      };

      if (intent === "cancel") {
        const confirmed = window.confirm(
          "Cancelar esta atividade? O registro permanece visível, mas não poderá ser editado nem reaberto.",
        );
        if (!confirmed) {
          return _prev;
        }
        payload.status = ActivityStatus.CANCELLED;
      } else if (intent === "reopen") {
        // DE-06: omit destination → Em andamento
      } else {
        payload.status = String(formData.get("status") ?? "") as ActivityStatus;
      }

      return action(payload);
    },
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  if (status === ActivityStatus.CANCELLED) {
    return null;
  }

  const destinations = moveTargets(status);
  const defaultMove =
    status === ActivityStatus.DONE ? ActivityStatus.IN_PROGRESS : status;

  return (
    <form action={submit} className="flex max-w-xl flex-col gap-3" key={version}>
      <input type="hidden" name="id" value={activityId} />
      <input type="hidden" name="version" value={version} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5" htmlFor="activity-status-move">
          <span className="text-label-sm text-on-surface-variant">Mover para</span>
          <select
            id="activity-status-move"
            name="status"
            defaultValue={defaultMove}
            disabled={pending}
            className={CONTROL_CLASS_NAME}
          >
            {destinations.map((value) => (
              <option key={value} value={value}>
                {ACTIVITY_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          name="intent"
          value="move"
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-outline"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            arrow_forward
          </span>
          {pending ? "Movendo…" : "Mover"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {status === ActivityStatus.DONE ? (
          <button
            type="submit"
            name="intent"
            value="reopen"
            disabled={pending}
            className="rounded-md px-2 py-1 text-label-md font-semibold text-primary hover:underline disabled:opacity-50"
          >
            Reabrir
          </button>
        ) : null}
        <button
          type="submit"
          name="intent"
          value="cancel"
          disabled={pending}
          className="rounded-xl bg-error-container px-3 py-1.5 text-label-md font-semibold text-on-error-container transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      {state && !state.ok ? (
        <p className="text-body-sm text-error" role="alert">
          {state.error.message}
        </p>
      ) : null}
    </form>
  );
}
