import { ACTIVITY_STATUS_LABELS, KANBAN_COLUMN_STATUSES } from "@/domain/activity/enums";
import type { ActivityStatus } from "@/domain/activity/enums";
import {
  ARCHITECTURE_ROLE_LABELS,
  EFFORT_LABELS,
  PRIORITY_LABELS,
} from "@/domain/catalog/classifications";
import type { ActivityListItem, ActivityUserRef } from "@/application/activities/types";

/** RN-01: um único board da equipe. Período e pessoa são filtros (T19/T20), não boards. */
export const KANBAN_BOARD_SCOPE = "team" as const;

export type KanbanColumnStatus = (typeof KANBAN_COLUMN_STATUSES)[number];

export type KanbanColumn = {
  status: KanbanColumnStatus;
  label: string;
  activities: ActivityListItem[];
};

export type KanbanCardData = {
  activityId: string;
  title: string;
  projectName: string | null;
  areaLabel: string;
  ownerLabel: string;
  priorityLabel: string;
  effortLabel: string | null;
  roleLabel: string;
  checklistLabel: string | null;
  expectedEndDate: string | null;
};

function ownerLabel(owner: ActivityUserRef): string {
  const name = owner.displayName ?? owner.email ?? "Sem identificação";
  return owner.isActive ? name : `${name} (inativo)`;
}

/** RN-02: um card = uma atividade, com os campos essenciais do PRD §13.2. */
export function toKanbanCard(activity: ActivityListItem): KanbanCardData {
  const areaName = activity.requestingArea.name;
  return {
    activityId: activity.id,
    title: activity.title,
    projectName: activity.project?.name ?? null,
    areaLabel: activity.requestingArea.isActive ? areaName : `${areaName} (inativa)`,
    ownerLabel: ownerLabel(activity.owner),
    priorityLabel: PRIORITY_LABELS[activity.priority],
    effortLabel: activity.effort ? EFFORT_LABELS[activity.effort] : null,
    roleLabel: ARCHITECTURE_ROLE_LABELS[activity.architectureRole],
    checklistLabel:
      activity.checklistTotalCount > 0
        ? `${activity.checklistDoneCount}/${activity.checklistTotalCount}`
        : null,
    expectedEndDate: activity.expectedEndDate,
  };
}

/**
 * Monta as seis colunas padrão. Cancelado nunca vira coluna (RN-10);
 * itens cancelados ou com status fora do board são ignorados.
 */
export function buildKanbanBoard(activities: readonly ActivityListItem[]): KanbanColumn[] {
  const byStatus = new Map<ActivityStatus, ActivityListItem[]>();
  for (const status of KANBAN_COLUMN_STATUSES) {
    byStatus.set(status, []);
  }

  for (const activity of activities) {
    const column = byStatus.get(activity.status);
    if (column) {
      column.push(activity);
    }
  }

  return KANBAN_COLUMN_STATUSES.map((status) => ({
    status,
    label: ACTIVITY_STATUS_LABELS[status],
    activities: byStatus.get(status) ?? [],
  }));
}
