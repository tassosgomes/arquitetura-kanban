import { realtimeRetentionStart } from "@/infrastructure/realtime/constants";
import type { RealtimeEventStore } from "@/infrastructure/realtime/types";

export type ParsedLastEventId = { kind: "absent" } | { kind: "invalid" } | { kind: "id"; id: bigint };

/**
 * Canonical cursor is the `Last-Event-ID` header. `?lastEventId=` is an escape
 * for clients that are not `EventSource`.
 */
export function readLastEventId(request: Request): string | undefined {
  const header = request.headers.get("Last-Event-ID")?.trim();
  if (header) {
    return header;
  }
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("lastEventId")?.trim();
    return query || undefined;
  } catch {
    return undefined;
  }
}

export function parseLastEventId(raw: string | undefined): ParsedLastEventId {
  if (raw === undefined || raw.trim() === "") {
    return { kind: "absent" };
  }
  const trimmed = raw.trim();
  if (!/^[1-9][0-9]*$/.test(trimmed)) {
    return { kind: "invalid" };
  }
  return { kind: "id", id: BigInt(trimmed) };
}

export type CursorEvaluation =
  | { kind: "absent" }
  | { kind: "expired" }
  | { kind: "valid"; id: bigint };

/**
 * docs/realtime.md §8:
 * expired when not a positive integer; missing row with cursor < MIN(id);
 * or the row exists but is older than the 7-day window.
 */
export async function evaluateRealtimeCursor(
  store: RealtimeEventStore,
  raw: string | undefined,
  now: Date,
): Promise<CursorEvaluation> {
  const parsed = parseLastEventId(raw);
  if (parsed.kind === "absent") {
    return { kind: "absent" };
  }
  if (parsed.kind === "invalid") {
    return { kind: "expired" };
  }

  const row = await store.findById(parsed.id);
  const retainedSince = realtimeRetentionStart(now);

  if (row) {
    if (row.createdAt < retainedSince) {
      return { kind: "expired" };
    }
    return { kind: "valid", id: parsed.id };
  }

  const minId = await store.minId();
  if (minId === null || parsed.id < minId) {
    return { kind: "expired" };
  }

  return { kind: "valid", id: parsed.id };
}
