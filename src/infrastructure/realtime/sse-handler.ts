import {
  SSE_HEARTBEAT_MS,
  SSE_RETRY_MS,
  SSE_SESSION_REVALIDATE_EVERY,
  realtimeRetentionStart,
} from "@/infrastructure/realtime/constants";
import { evaluateRealtimeCursor, readLastEventId } from "@/infrastructure/realtime/cursor";
import type { RealtimeHubPort } from "@/infrastructure/realtime/hub";
import { realtimeAuthErrorResponse } from "@/infrastructure/realtime/sse-auth";
import {
  formatDomainSseFrame,
  formatResyncSseFrame,
  formatSseKeepalive,
  formatSseRetry,
  SSE_RESPONSE_HEADERS,
} from "@/infrastructure/realtime/sse-format";
import type { PersistedRealtimeEvent, RealtimeEventStore } from "@/infrastructure/realtime/types";

export type RealtimeSseDeps = {
  authenticate: () => Promise<unknown>;
  store: RealtimeEventStore;
  hub: RealtimeHubPort;
  now?: () => Date;
  revalidateSession?: () => Promise<unknown>;
  heartbeatMs?: number;
};

export async function handleRealtimeSseGet(
  request: Request,
  deps: RealtimeSseDeps,
): Promise<Response> {
  try {
    await deps.authenticate();
  } catch (error) {
    const refused = realtimeAuthErrorResponse(error);
    if (refused) {
      return refused;
    }
    throw error;
  }

  return openRealtimeSse(request, deps);
}

export function openRealtimeSse(request: Request, deps: RealtimeSseDeps): Response {
  const encoder = new TextEncoder();
  const now = deps.now ?? (() => new Date());
  const heartbeatMs = deps.heartbeatMs ?? SSE_HEARTBEAT_MS;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | undefined;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let heartbeats = 0;

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        unsubscribe?.();
        if (heartbeat !== undefined) {
          clearInterval(heartbeat);
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const enqueue = (chunk: string) => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };

      request.signal.addEventListener("abort", close);

      try {
        enqueue(formatSseRetry(SSE_RETRY_MS));

        const rawCursor = readLastEventId(request);
        const cursor = await evaluateRealtimeCursor(deps.store, rawCursor, now());
        const retainedSince = realtimeRetentionStart(now());

        let lastSent = 0n;

        if (cursor.kind === "expired") {
          enqueue(formatResyncSseFrame());
          lastSent = (await deps.store.maxId()) ?? 0n;
        } else if (cursor.kind === "valid") {
          lastSent = cursor.id;
          const replay = await deps.store.listAfter(cursor.id, retainedSince);
          for (const event of replay) {
            enqueue(formatDomainSseFrame(event));
            if (event.id > lastSent) {
              lastSent = event.id;
            }
          }
        } else {
          lastSent = (await deps.store.maxId()) ?? 0n;
        }

        await deps.hub.ensureListening();

        const catchUp = await deps.store.listAfter(lastSent, realtimeRetentionStart(now()));
        for (const event of catchUp) {
          enqueue(formatDomainSseFrame(event));
          if (event.id > lastSent) {
            lastSent = event.id;
          }
        }

        unsubscribe = deps.hub.subscribe((event: PersistedRealtimeEvent) => {
          if (event.id <= lastSent) {
            return;
          }
          lastSent = event.id;
          enqueue(formatDomainSseFrame(event));
        });

        heartbeat = setInterval(() => {
          void (async () => {
            enqueue(formatSseKeepalive());
            heartbeats += 1;
            if (
              deps.revalidateSession &&
              heartbeats % SSE_SESSION_REVALIDATE_EVERY === 0
            ) {
              try {
                await deps.revalidateSession();
              } catch {
                close();
              }
            }
          })();
        }, heartbeatMs);
      } catch {
        close();
      }
    },
    cancel() {
      /* `start` abort listener already tears down timers/subscribe */
    },
  });

  return new Response(stream, { headers: SSE_RESPONSE_HEADERS });
}
