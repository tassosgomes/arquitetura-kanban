/** Status do projeto. Independente das atividades (RN-11). Cancelar em vez de excluir (decisão 9). */
export const ProjectStatus = {
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: "Planejado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

/** DE-14: projeto “ativo” = status ≠ Cancelado. */
export function isActiveProjectStatus(status: ProjectStatus): boolean {
  return status !== ProjectStatus.CANCELLED;
}

/**
 * T02/§13 does not allow business-field edits after cancel.
 * Cancelled projects are view-only (cancel is terminal for the cadastro).
 */
export function canEditProject(status: ProjectStatus): boolean {
  return isActiveProjectStatus(status);
}
