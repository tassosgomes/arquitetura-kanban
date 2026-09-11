"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ActionResult } from "@/app/actions/action-result";
import {
  addActivityTaskAction,
  removeActivityTaskAction,
  reorderActivityTasksAction,
  toggleActivityTaskAction,
  updateActivityTaskAction,
} from "@/app/actions/activities";
import type { ActivityChecklistResult, ActivityTaskRecord } from "@/application/activities";
import { canEditActivity, type ActivityStatus } from "@/domain/activity/enums";
import { formatChecklistProgress } from "@/domain/activity/checklist";
import { CONTROL_CLASS_NAME } from "@/ui/projects/project-types";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";
import { FieldError } from "@/ui/forms/FieldError";
import { useProtectOpenEdit } from "@/ui/realtime/useProtectOpenEdit";

type ActivityChecklistProps = {
  activityId: string;
  version: number;
  status: ActivityStatus;
  tasks: ActivityTaskRecord[];
};

type EditingState = { id: string; text: string };

const TEXT_BUTTON_CLASS =
  "rounded-md px-2 py-1 text-label-sm font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-outline disabled:no-underline";

function applyResult(
  result: ActionResult<ActivityChecklistResult>,
  onSuccess: (data: ActivityChecklistResult) => void,
  onConflict: (message: string) => void,
  onError: (message: string, fields?: Record<string, string[]>) => void,
) {
  if (result.ok) {
    onSuccess(result.data);
    return;
  }
  if (result.error.code === "CONFLICT") {
    onConflict(result.error.message);
    return;
  }
  onError(result.error.message, result.error.fields);
}

function SortableTaskRow({
  task,
  index,
  total,
  disabled,
  pending,
  editing,
  onToggle,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
  onRemove,
  onMove,
}: {
  task: ActivityTaskRecord;
  index: number;
  total: number;
  disabled: boolean;
  pending: boolean;
  editing: EditingState | null;
  onToggle: (task: ActivityTaskRecord) => void;
  onStartEdit: (task: ActivityTaskRecord) => void;
  onChangeEdit: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRemove: (task: ActivityTaskRecord) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: disabled || pending,
  });
  const checkboxId = `task-${task.id}`;
  const editId = `task-edit-${task.id}`;
  const isEditing = editing?.id === task.id;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex flex-col gap-2 rounded-xl bg-surface-container-low p-space-sm ${
        isDragging ? "z-10 shadow-md" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {disabled ? null : (
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none rounded px-1 text-outline hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing"
            aria-label={`Reordenar ${task.description}`}
            disabled={pending}
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
        )}
        <input
          id={checkboxId}
          type="checkbox"
          className="mt-1 size-4 shrink-0 rounded border-outline-variant text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          checked={task.isDone}
          disabled={disabled || pending}
          onChange={() => onToggle(task)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {isEditing ? (
            <>
              <label htmlFor={editId} className="sr-only">
                Editar descrição da tarefa
              </label>
              <input
                id={editId}
                value={editing.text}
                onChange={(event) => onChangeEdit(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSaveEdit();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelEdit();
                  }
                }}
                className={CONTROL_CLASS_NAME}
                disabled={pending}
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" className={TEXT_BUTTON_CLASS} disabled={pending} onClick={onSaveEdit}>
                  Salvar
                </button>
                <button type="button" className={TEXT_BUTTON_CLASS} disabled={pending} onClick={onCancelEdit}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <label
              htmlFor={checkboxId}
              className={`text-body-sm ${task.isDone ? "text-outline line-through" : "text-on-surface"}`}
            >
              {task.description}
            </label>
          )}
        </div>
      </div>
      {disabled || isEditing ? null : (
        <div className="flex flex-wrap gap-1 pl-10">
          <button
            type="button"
            className={TEXT_BUTTON_CLASS}
            disabled={pending || index === 0}
            onClick={() => onMove(index, -1)}
          >
            Subir
          </button>
          <button
            type="button"
            className={TEXT_BUTTON_CLASS}
            disabled={pending || index === total - 1}
            onClick={() => onMove(index, 1)}
          >
            Descer
          </button>
          <button
            type="button"
            className={TEXT_BUTTON_CLASS}
            disabled={pending}
            onClick={() => onStartEdit(task)}
          >
            Editar
          </button>
          <button
            type="button"
            className={`${TEXT_BUTTON_CLASS} text-error hover:text-error`}
            disabled={pending}
            onClick={() => onRemove(task)}
          >
            Remover
          </button>
        </div>
      )}
    </li>
  );
}

export function ActivityChecklist({
  activityId,
  version: serverVersion,
  status,
  tasks: serverTasks,
}: ActivityChecklistProps) {
  const router = useRouter();
  const addFieldId = useId();
  const editable = canEditActivity(status);
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<ActivityChecklistResult | null>(null);
  const [reorderPreview, setReorderPreview] = useState<ActivityTaskRecord[] | null>(null);
  const [addText, setAddText] = useState("");
  const [addError, setAddError] = useState<string | undefined>();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useProtectOpenEdit(addText.trim() !== "" || editing !== null);

  const usePendingResult = lastResult !== null && lastResult.version > serverVersion;
  const version = usePendingResult ? lastResult.version : serverVersion;
  const tasks = reorderPreview ?? (usePendingResult ? lastResult.tasks : serverTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const progress = formatChecklistProgress(tasks);
  const pending = isPending;

  function onSuccess(data: ActivityChecklistResult) {
    setConflict(null);
    setError(null);
    setReorderPreview(null);
    setLastResult(data);
    router.refresh();
  }

  function onConflict(message: string) {
    setConflict(message);
    setError(null);
  }

  function onError(message: string, fields?: Record<string, string[]>) {
    setError(fields?.description?.[0] ?? message);
  }

  function persistOrder(next: ActivityTaskRecord[]) {
    setReorderPreview(next);
    startTransition(async () => {
      const result = await reorderActivityTasksAction({
        activityId,
        version,
        orderedTaskIds: next.map((task) => task.id),
      });
      applyResult(
        result,
        (data) => onSuccess(data),
        (message) => {
          setReorderPreview(null);
          onConflict(message);
        },
        (message) => {
          setReorderPreview(null);
          onError(message);
        },
      );
    });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!editable || pending || !event.over) {
      return;
    }
    const oldIndex = tasks.findIndex((task) => task.id === event.active.id);
    const newIndex = tasks.findIndex((task) => task.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return;
    }
    persistOrder(arrayMove(tasks, oldIndex, newIndex));
  }

  function onMove(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tasks.length) {
      return;
    }
    persistOrder(arrayMove(tasks, index, nextIndex));
  }

  function onAdd() {
    setAddError(undefined);
    setError(null);
    startTransition(async () => {
      const result = await addActivityTaskAction({
        activityId,
        version,
        description: addText,
      });
      applyResult(
        result,
        (data) => {
          setAddText("");
          onSuccess(data);
        },
        onConflict,
        (message, fields) => {
          setAddError(fields?.description?.[0]);
          onError(message, fields);
        },
      );
    });
  }

  function onToggle(task: ActivityTaskRecord) {
    startTransition(async () => {
      const result = await toggleActivityTaskAction({
        activityId,
        taskId: task.id,
        version,
        isDone: !task.isDone,
      });
      applyResult(result, onSuccess, onConflict, onError);
    });
  }

  function onSaveEdit() {
    if (!editing) {
      return;
    }
    startTransition(async () => {
      const result = await updateActivityTaskAction({
        activityId,
        taskId: editing.id,
        version,
        description: editing.text,
      });
      applyResult(
        result,
        (data) => {
          setEditing(null);
          onSuccess(data);
        },
        onConflict,
        onError,
      );
    });
  }

  function onRemove(task: ActivityTaskRecord) {
    startTransition(async () => {
      const result = await removeActivityTaskAction({
        activityId,
        taskId: task.id,
        version,
      });
      applyResult(
        result,
        (data) => {
          setEditing((current) => (current?.id === task.id ? null : current));
          onSuccess(data);
        },
        onConflict,
        onError,
      );
    });
  }

  function reload() {
    setConflict(null);
    setError(null);
    setLastResult(null);
    setReorderPreview(null);
    router.refresh();
  }

  return (
    <section
      aria-labelledby="activity-checklist-title"
      className="flex max-w-3xl flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-checklist-title" className="text-headline-md text-on-surface">
          Tarefas
        </h2>
        <p className="font-mono text-code-sm font-semibold text-primary" aria-live="polite">
          Progresso {progress}
        </p>
      </div>

      {conflict ? (
        <div
          className="rounded-xl border border-secondary-container/40 bg-secondary-container/10 p-space-md text-body-sm text-on-surface"
          role="alert"
        >
          <p>{conflict}</p>
          <button type="button" onClick={reload} className={`mt-2 ${TEXT_BUTTON_CLASS}`}>
            Recarregar os dados
          </button>
        </div>
      ) : null}

      {error && !addError ? (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          Nenhuma tarefa. A atividade pode permanecer sem checklist.
        </p>
      ) : editable ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-2">
              {tasks.map((task, index) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  index={index}
                  total={tasks.length}
                  disabled={!editable}
                  pending={pending}
                  editing={editing}
                  onToggle={onToggle}
                  onStartEdit={(item) => setEditing({ id: item.id, text: item.description })}
                  onChangeEdit={(text) =>
                    setEditing((current) => (current ? { ...current, text } : current))
                  }
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={() => setEditing(null)}
                  onRemove={onRemove}
                  onMove={onMove}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <ol className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3 rounded-xl bg-surface-container-low p-space-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 rounded border-outline-variant"
                checked={task.isDone}
                disabled
                readOnly
              />
              <span className={`text-body-sm ${task.isDone ? "text-outline line-through" : "text-on-surface"}`}>
                {task.description}
              </span>
            </li>
          ))}
        </ol>
      )}

      {editable ? (
        <form
          className="flex flex-col gap-3 border-t border-outline-variant/60 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onAdd();
          }}
        >
          <label htmlFor={addFieldId} className="text-label-md font-semibold text-on-surface">
            Nova tarefa
          </label>
          <input
            id={addFieldId}
            value={addText}
            onChange={(event) => setAddText(event.target.value)}
            placeholder="Descrição da tarefa"
            className={CONTROL_CLASS_NAME}
            disabled={pending}
            aria-invalid={Boolean(addError)}
            aria-describedby={addError ? `${addFieldId}-error` : undefined}
          />
          <FieldError id={addError ? `${addFieldId}-error` : undefined} message={addError} />
          <PrimaryButton type="submit" isLoading={pending}>
            Adicionar tarefa
          </PrimaryButton>
        </form>
      ) : null}
    </section>
  );
}
