import { REALTIME_SSE_PATH } from "@/ui/realtime/constants";

export type RealtimeClientEvent =
  | { kind: "resync" }
  | { kind: "domain"; id: string };

export type RealtimeRefreshAction = "refresh" | "defer" | "skip";

export type RealtimeClientDecision = {
  action: RealtimeRefreshAction;
  lastEventId: string | null;
  reconnectWithoutCursor: boolean;
};

export function isDuplicateRealtimeId(
  lastAppliedId: string | null,
  incomingId: string,
): boolean {
  if (lastAppliedId === null) {
    return false;
  }
  try {
    return BigInt(incomingId) <= BigInt(lastAppliedId);
  } catch {
    return false;
  }
}

/**
 * Hook policy: dirty forms never get a blind `router.refresh()`.
 * `resync` drops the cursor so the next connection does not send Last-Event-ID.
 */
export function decideRealtimeClientEvent(input: {
  lastEventId: string | null;
  formDirty: boolean;
  event: RealtimeClientEvent;
}): RealtimeClientDecision {
  if (input.event.kind === "resync") {
    return {
      action: input.formDirty ? "defer" : "refresh",
      lastEventId: null,
      reconnectWithoutCursor: true,
    };
  }

  if (isDuplicateRealtimeId(input.lastEventId, input.event.id)) {
    return {
      action: "skip",
      lastEventId: input.lastEventId,
      reconnectWithoutCursor: false,
    };
  }

  return {
    action: input.formDirty ? "defer" : "refresh",
    lastEventId: input.event.id,
    reconnectWithoutCursor: false,
  };
}

export function buildRealtimeSseUrl(lastEventId: string | null): string {
  if (!lastEventId) {
    return REALTIME_SSE_PATH;
  }
  const params = new URLSearchParams({ lastEventId });
  return `${REALTIME_SSE_PATH}?${params.toString()}`;
}
