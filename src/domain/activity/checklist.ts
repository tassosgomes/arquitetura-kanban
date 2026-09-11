export type ChecklistProgressItem = {
  isDone: boolean;
};

export function checklistProgress(tasks: readonly ChecklistProgressItem[]): {
  done: number;
  total: number;
} {
  return {
    done: tasks.filter((task) => task.isDone).length,
    total: tasks.length,
  };
}

/** Indicador X/Y (RN-20). Zero tarefas → `0/0`. */
export function formatChecklistProgress(tasks: readonly ChecklistProgressItem[]): string {
  const { done, total } = checklistProgress(tasks);
  return `${done}/${total}`;
}

/** `orderedIds` is a rearrangement of `currentIds` (no extras, gaps, or duplicates). */
export function isTaskOrderPermutation(
  orderedIds: readonly string[],
  currentIds: readonly string[],
): boolean {
  if (orderedIds.length !== currentIds.length) {
    return false;
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    return false;
  }
  const current = new Set(currentIds);
  return orderedIds.every((id) => current.has(id));
}
