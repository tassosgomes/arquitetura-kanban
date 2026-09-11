export const ACTIVITY_HISTORY_PAGE_SIZE = 20;

export type ActivityHistoryItem = {
  sequence: string;
  occurredAt: string;
  actorLabel: string;
  summary: string;
};

export type ActivityHistoryPage = {
  items: ActivityHistoryItem[];
  hasMore: boolean;
  /** Cursor (`sequence`) of the oldest item in `items`; pass as `beforeSequence` to load older events. */
  oldestSequence: string | null;
};
