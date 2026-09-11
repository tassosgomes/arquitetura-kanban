import type { PersistedRealtimeEvent } from "@/infrastructure/realtime/types";

export function formatSseRetry(retryMs: number): string {
  return `retry: ${retryMs}\n\n`;
}

export function formatSseKeepalive(): string {
  return ": keepalive\n\n";
}

export function formatSseFrame(fields: {
  id?: string;
  event?: string;
  data: string;
}): string {
  let body = "";
  if (fields.id !== undefined) {
    body += `id: ${fields.id}\n`;
  }
  if (fields.event !== undefined) {
    body += `event: ${fields.event}\n`;
  }
  body += `data: ${fields.data}\n\n`;
  return body;
}

export function formatDomainSseFrame(event: PersistedRealtimeEvent): string {
  return formatSseFrame({
    id: event.id.toString(),
    event: event.type,
    data: JSON.stringify(event.payload),
  });
}

/** Control frame — not a `RealtimeEvent` row, so no `id:` field. */
export function formatResyncSseFrame(): string {
  return formatSseFrame({
    event: "resync",
    data: JSON.stringify({ reason: "cursor_expired" }),
  });
}

export const SSE_RESPONSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-store, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;
