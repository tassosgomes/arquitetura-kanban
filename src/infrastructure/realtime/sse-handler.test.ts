import { describe, expect, it } from "vitest";
import { UnauthorizedError, ForbiddenError } from "@/domain/errors";
import { evaluateRealtimeCursor, parseLastEventId, readLastEventId } from "@/infrastructure/realtime/cursor";
import { getListenConnectionString } from "@/infrastructure/realtime/notify";
import type { RealtimeHubPort } from "@/infrastructure/realtime/hub";
import { handleRealtimeSseGet } from "@/infrastructure/realtime/sse-handler";
import { formatDomainSseFrame, formatResyncSseFrame } from "@/infrastructure/realtime/sse-format";
import type { PersistedRealtimeEvent, RealtimeEventStore } from "@/infrastructure/realtime/types";

const NOW = new Date("2026-09-10T12:00:00.000Z");

function memoryStore(events: PersistedRealtimeEvent[]): RealtimeEventStore {
  return {
    async findById(id) {
      return events.find((event) => event.id === id) ?? null;
    },
    async listAfter(cursorExclusive, retainedSince) {
      return events
        .filter((event) => event.id > cursorExclusive && event.createdAt >= retainedSince)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    },
    async minId() {
      if (events.length === 0) {
        return null;
      }
      return events.reduce((min, event) => (event.id < min ? event.id : min), events[0]!.id);
    },
    async maxId() {
      if (events.length === 0) {
        return null;
      }
      return events.reduce((max, event) => (event.id > max ? event.id : max), events[0]!.id);
    },
  };
}

function stubHub(): RealtimeHubPort {
  return {
    ensureListening: async () => undefined,
    subscribe: () => () => undefined,
  };
}

async function readSseUntil(
  response: Response,
  controller: AbortController,
  predicate: (text: string) => boolean,
  timeoutMs = 1500,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("expected SSE body");
  }
  const decoder = new TextDecoder();
  let text = "";
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    while (!controller.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      text += decoder.decode(value, { stream: true });
      if (predicate(text)) {
        break;
      }
    }
  } catch {
    /* abort */
  } finally {
    clearTimeout(timeout);
    if (!controller.signal.aborted) {
      controller.abort();
    }
    await reader.cancel().catch(() => undefined);
  }
  return text;
}

describe("SSE cursor helpers", () => {
  it("uses DATABASE_URL_LISTEN when set and otherwise DATABASE_URL", () => {
    expect(
      getListenConnectionString({
        DATABASE_URL: "postgresql://app/db",
        DATABASE_URL_LISTEN: "postgresql://direct/db",
      }),
    ).toBe("postgresql://direct/db");
    expect(getListenConnectionString({ DATABASE_URL: "postgresql://app/db" })).toBe(
      "postgresql://app/db",
    );
  });
  it("parses Last-Event-ID and prefers the header over the query", () => {
    expect(parseLastEventId(undefined).kind).toBe("absent");
    expect(parseLastEventId("0").kind).toBe("invalid");
    expect(parseLastEventId("abc").kind).toBe("invalid");
    expect(parseLastEventId("1842")).toEqual({ kind: "id", id: 1842n });

    const request = new Request("http://localhost/api/realtime/sse?lastEventId=9", {
      headers: { "Last-Event-ID": "12" },
    });
    expect(readLastEventId(request)).toBe("12");
    expect(readLastEventId(new Request("http://localhost/api/realtime/sse?lastEventId=9"))).toBe(
      "9",
    );
  });

  it("marks a cursor expired when it predates retained ids or the 7-day window", async () => {
    const retained = memoryStore([
      {
        id: 50n,
        type: "project.changed",
        payload: { entityKind: "project", entityId: "p" },
        createdAt: NOW,
      },
    ]);
    expect(await evaluateRealtimeCursor(retained, "1", NOW)).toEqual({ kind: "expired" });
    expect(await evaluateRealtimeCursor(retained, "50", NOW)).toEqual({ kind: "valid", id: 50n });
    expect(await evaluateRealtimeCursor(retained, undefined, NOW)).toEqual({ kind: "absent" });
    expect(await evaluateRealtimeCursor(retained, "nope", NOW)).toEqual({ kind: "expired" });

    const stale = memoryStore([
      {
        id: 3n,
        type: "project.changed",
        payload: { entityKind: "project", entityId: "p" },
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
      },
    ]);
    expect(await evaluateRealtimeCursor(stale, "3", NOW)).toEqual({ kind: "expired" });
  });
});

describe("GET /api/realtime/sse contract", () => {
  it("refuses an invalid session with 401 and no event stream", async () => {
    const response = await handleRealtimeSseGet(
      new Request("http://localhost/api/realtime/sse"),
      {
        authenticate: async () => {
          throw new UnauthorizedError();
        },
        store: memoryStore([]),
        hub: stubHub(),
      },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type") ?? "").not.toMatch(/event-stream/);
    expect(await response.text()).toBe("Authentication required");
  });

  it("refuses an inactive user with 403 and no event stream", async () => {
    const response = await handleRealtimeSseGet(
      new Request("http://localhost/api/realtime/sse"),
      {
        authenticate: async () => {
          throw new ForbiddenError();
        },
        store: memoryStore([]),
        hub: stubHub(),
      },
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("content-type") ?? "").not.toMatch(/event-stream/);
  });

  it("replays persisted events with id greater than Last-Event-ID", async () => {
    const events: PersistedRealtimeEvent[] = [
      {
        id: 100n,
        type: "project.changed",
        payload: { entityKind: "project", entityId: "p0" },
        createdAt: NOW,
      },
      {
        id: 101n,
        type: "activity.created",
        payload: { entityKind: "activity", entityId: "a1" },
        createdAt: NOW,
      },
      {
        id: 102n,
        type: "activity.updated",
        payload: { entityKind: "activity", entityId: "a1" },
        createdAt: NOW,
      },
    ];
    const controller = new AbortController();
    const response = await handleRealtimeSseGet(
      new Request("http://localhost/api/realtime/sse", {
        headers: { "Last-Event-ID": "100" },
        signal: controller.signal,
      }),
      {
        authenticate: async () => ({ id: "user" }),
        store: memoryStore(events),
        hub: stubHub(),
        now: () => NOW,
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/event-stream/);
    const text = await readSseUntil(response, controller, (chunk) =>
      chunk.includes("id: 102"),
    );

    expect(text).toContain("retry: 3000");
    expect(text).toMatch(/^id: 101$/m);
    expect(text).toMatch(/^id: 102$/m);
    expect(text).not.toMatch(/^id: 100$/m);
    expect(text).toContain(formatDomainSseFrame(events[1]!));
  });

  it("emits a control resync frame for an expired cursor and does not invent replay", async () => {
    const events: PersistedRealtimeEvent[] = [
      {
        id: 200n,
        type: "catalog.changed",
        payload: { entityKind: "area", entityId: "ar" },
        createdAt: NOW,
      },
    ];
    const controller = new AbortController();
    const response = await handleRealtimeSseGet(
      new Request("http://localhost/api/realtime/sse", {
        headers: { "Last-Event-ID": "1" },
        signal: controller.signal,
      }),
      {
        authenticate: async () => ({ id: "user" }),
        store: memoryStore(events),
        hub: stubHub(),
        now: () => NOW,
      },
    );

    const text = await readSseUntil(response, controller, (chunk) =>
      chunk.includes("event: resync"),
    );
    expect(text).toContain(formatResyncSseFrame().trim());
    expect(text).not.toMatch(/^id: 200$/m);
  });
});
