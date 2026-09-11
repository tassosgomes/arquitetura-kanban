"use client";

import { useEffect, useRef } from "react";
import { subscribeRealtimeSse } from "@/ui/realtime/subscribe-realtime-sse";

export type UseRealtimeSseOptions = {
  getFormDirty: () => boolean;
  onRefresh: () => void;
  onDefer: () => void;
  EventSourceImpl?: typeof EventSource;
  retryMs?: number;
};

/**
 * Authenticated-app SSE subscriber. `router.refresh()` is applied by the
 * caller so Kanban searchParams stay on the current URL.
 */
export function useRealtimeSse(options: UseRealtimeSseOptions): void {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const EventSourceImpl = options.EventSourceImpl;
  const retryMs = options.retryMs;

  useEffect(() => {
    return subscribeRealtimeSse({
      EventSourceImpl,
      retryMs,
      getFormDirty: () => optionsRef.current.getFormDirty(),
      onRefresh: () => optionsRef.current.onRefresh(),
      onDefer: () => optionsRef.current.onDefer(),
    });
  }, [EventSourceImpl, retryMs]);
}
