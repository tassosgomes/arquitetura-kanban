export type PersistedRealtimeEvent = {
  id: bigint;
  type: string;
  payload: unknown;
  createdAt: Date;
};

export type RealtimeEventStore = {
  findById(id: bigint): Promise<PersistedRealtimeEvent | null>;
  listAfter(cursorExclusive: bigint, retainedSince: Date): Promise<PersistedRealtimeEvent[]>;
  minId(): Promise<bigint | null>;
  maxId(): Promise<bigint | null>;
};
