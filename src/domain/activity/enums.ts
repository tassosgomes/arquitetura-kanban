/** Tipo da atividade. Projeto exige vínculo; Ad hoc não tem projectId. */
export const ActivityType = {
  PROJECT: "PROJECT",
  AD_HOC: "AD_HOC",
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  PROJECT: "Projeto",
  AD_HOC: "Ad hoc",
};

/**
 * Status do Kanban (nomes de domínio em português).
 * Cancelado é terminal e não ocupa coluna padrão (RN-10).
 */
export const ActivityStatus = {
  BACKLOG: "BACKLOG",
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING: "WAITING",
  BLOCKED: "BLOCKED",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
} as const;

export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando retorno",
  BLOCKED: "Bloqueado",
  DONE: "Concluído",
  CANCELLED: "Cancelado",
};

/** Seis colunas padrão do board. Cancelado fica de fora. */
export const KANBAN_COLUMN_STATUSES: readonly ActivityStatus[] = [
  ActivityStatus.BACKLOG,
  ActivityStatus.TODO,
  ActivityStatus.IN_PROGRESS,
  ActivityStatus.WAITING,
  ActivityStatus.BLOCKED,
  ActivityStatus.DONE,
];
