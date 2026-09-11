/** PostgreSQL NOTIFY / LISTEN channel (docs/realtime.md §4). */
export const REALTIME_CHANNEL = "realtime";

/** SSE `retry:` so EventSource reconnects after a drop (ms). */
export const SSE_RETRY_MS = 3000;

/** Comment-line heartbeat; ignored by EventSource handlers. */
export const SSE_HEARTBEAT_MS = 15_000;

/** Re-check Auth.js session + isActive on this many heartbeats (~60s). */
export const SSE_SESSION_REVALIDATE_EVERY = 4;

/**
 * Vercel Function ceiling declared on `GET /api/realtime/sse`.
 * Hobby / Fluid default is 300s; the client reconnects and replays.
 * Kubernetes does not apply this cap (T29).
 */
export const SSE_MAX_DURATION_SECONDS = 300;

/** RealtimeEvent retention window (cleanup is T29; replay never returns older rows). */
export const REALTIME_RETENTION_DAYS = 7;

export const REALTIME_RETENTION_MS = REALTIME_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function realtimeRetentionStart(now: Date): Date {
  return new Date(now.getTime() - REALTIME_RETENTION_MS);
}
