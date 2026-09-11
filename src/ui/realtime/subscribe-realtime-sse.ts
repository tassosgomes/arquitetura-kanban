import { RealtimeEventType } from "@/application/realtime/types";
import { REALTIME_SSE_RETRY_MS } from "@/ui/realtime/constants";
import {
  buildRealtimeSseUrl,
  decideRealtimeClientEvent,
} from "@/ui/realtime/refresh-policy";

export type RealtimeSseSubscribeOptions = {
  EventSourceImpl?: typeof EventSource;
  getFormDirty: () => boolean;
  onRefresh: () => void;
  onDefer: () => void;
  retryMs?: number;
};

const DOMAIN_EVENT_TYPES: readonly string[] = Object.values(RealtimeEventType);

/**
 * Opens `EventSource` with cookies. Native reconnect sends `Last-Event-ID`.
 * A CLOSED source is recreated with `?lastEventId=` (docs/realtime.md §5).
 * `event: resync` drops the cursor and reconnects without it.
 */
export function subscribeRealtimeSse(options: RealtimeSseSubscribeOptions): () => void {
  const EventSourceImpl = options.EventSourceImpl ?? globalThis.EventSource;
  if (typeof EventSourceImpl !== "function") {
    return () => undefined;
  }

  const retryMs = options.retryMs ?? REALTIME_SSE_RETRY_MS;
  let disposed = false;
  let lastEventId: string | null = null;
  let source: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function applyDecision(
    event: { kind: "resync" } | { kind: "domain"; id: string },
  ) {
    const decision = decideRealtimeClientEvent({
      lastEventId,
      formDirty: options.getFormDirty(),
      event,
    });
    lastEventId = decision.lastEventId;

    if (decision.reconnectWithoutCursor) {
      openConnection(null);
    }

    if (decision.action === "refresh") {
      options.onRefresh();
    } else if (decision.action === "defer") {
      options.onDefer();
    }
  }

  function onDomainMessage(message: MessageEvent<string>) {
    if (disposed) {
      return;
    }
    const id = message.lastEventId?.trim();
    if (!id) {
      if (options.getFormDirty()) {
        options.onDefer();
      } else {
        options.onRefresh();
      }
      return;
    }
    applyDecision({ kind: "domain", id });
  }

  function onResync() {
    if (disposed) {
      return;
    }
    applyDecision({ kind: "resync" });
  }

  function onError() {
    if (disposed || !source) {
      return;
    }
    if (source.readyState !== EventSourceImpl.CLOSED) {
      return;
    }
    const cursor = lastEventId;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (disposed) {
        return;
      }
      openConnection(cursor);
    }, retryMs);
  }

  function detach(current: EventSource) {
    current.removeEventListener("resync", onResync);
    current.removeEventListener("error", onError);
    for (const type of DOMAIN_EVENT_TYPES) {
      current.removeEventListener(type, onDomainMessage);
    }
    current.close();
  }

  function openConnection(cursor: string | null) {
    clearReconnectTimer();
    if (source) {
      detach(source);
      source = null;
    }
    if (disposed) {
      return;
    }

    const next = new EventSourceImpl(buildRealtimeSseUrl(cursor), {
      withCredentials: true,
    });
    source = next;
    next.addEventListener("resync", onResync);
    next.addEventListener("error", onError);
    for (const type of DOMAIN_EVENT_TYPES) {
      next.addEventListener(type, onDomainMessage);
    }
  }

  openConnection(null);

  return () => {
    disposed = true;
    clearReconnectTimer();
    if (source) {
      detach(source);
      source = null;
    }
  };
}
