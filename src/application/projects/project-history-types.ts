export const PROJECT_HISTORY_PAGE_SIZE = 20;

export type ProjectHistorySourceKind = "project" | "activity" | "valueDelivery";

export type ProjectHistoryItem = {
  sequence: string;
  occurredAt: string;
  actorLabel: string;
  summary: string;
  sourceKind: ProjectHistorySourceKind;
  sourceLabel: string;
  sourceHref: string | null;
};

export type ProjectHistoryPage = {
  items: ProjectHistoryItem[];
  hasMore: boolean;
  /** Cursor (`sequence`) of the oldest item in `items`; pass as `beforeSequence` to load older events. */
  oldestSequence: string | null;
};
