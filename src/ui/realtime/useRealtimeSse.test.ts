import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeEventType } from "@/application/realtime/types";
import { REALTIME_SSE_PATH, REMOTE_UPDATE_BANNER } from "@/ui/realtime/constants";
import {
  buildRealtimeSseUrl,
  decideRealtimeClientEvent,
} from "@/ui/realtime/refresh-policy";
import { subscribeRealtimeSse } from "@/ui/realtime/subscribe-realtime-sse";

type Listener = (event: { lastEventId?: string }) => void;

class FakeEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: FakeEventSource[] = [];

  readonly url: string;
  readonly withCredentials: boolean;
  readyState = FakeEventSource.OPEN;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.withCredentials = Boolean(init?.withCredentials);
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as Listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.get(type)?.delete(listener as Listener);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  emit(type: string, event: { lastEventId?: string } = {}) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function lastSource(): FakeEventSource {
  const source = FakeEventSource.instances.at(-1);
  if (!source) {
    throw new Error("expected EventSource");
  }
  return source;
}

describe("useRealtimeSse policy (dirty vs refresh; resync)", () => {
  it("refreshes the current page when the form is clean", () => {
    expect(
      decideRealtimeClientEvent({
        lastEventId: null,
        formDirty: false,
        event: { kind: "domain", id: "10" },
      }),
    ).toEqual({
      action: "refresh",
      lastEventId: "10",
      reconnectWithoutCursor: false,
    });
  });

  it("defers refresh and keeps the cursor when the form is dirty", () => {
    expect(
      decideRealtimeClientEvent({
        lastEventId: "9",
        formDirty: true,
        event: { kind: "domain", id: "10" },
      }),
    ).toEqual({
      action: "defer",
      lastEventId: "10",
      reconnectWithoutCursor: false,
    });
  });

  it("ignores duplicate or older event ids", () => {
    expect(
      decideRealtimeClientEvent({
        lastEventId: "10",
        formDirty: false,
        event: { kind: "domain", id: "10" },
      }).action,
    ).toBe("skip");
    expect(
      decideRealtimeClientEvent({
        lastEventId: "10",
        formDirty: false,
        event: { kind: "domain", id: "9" },
      }).action,
    ).toBe("skip");
  });

  it("on resync reloads unless dirty, and always drops Last-Event-ID", () => {
    expect(
      decideRealtimeClientEvent({
        lastEventId: "99",
        formDirty: false,
        event: { kind: "resync" },
      }),
    ).toEqual({
      action: "refresh",
      lastEventId: null,
      reconnectWithoutCursor: true,
    });

    expect(
      decideRealtimeClientEvent({
        lastEventId: "99",
        formDirty: true,
        event: { kind: "resync" },
      }),
    ).toEqual({
      action: "defer",
      lastEventId: null,
      reconnectWithoutCursor: true,
    });
  });

  it("puts lastEventId on the query only when recreating a CLOSED source", () => {
    expect(buildRealtimeSseUrl(null)).toBe(REALTIME_SSE_PATH);
    expect(buildRealtimeSseUrl("1842")).toBe(`${REALTIME_SSE_PATH}?lastEventId=1842`);
  });
});

describe("useRealtimeSse EventSource subscriber", () => {
  afterEach(() => {
    FakeEventSource.instances = [];
    vi.useRealTimers();
  });

  it("opens /api/realtime/sse with cookies and refreshes on a domain event", () => {
    const onRefresh = vi.fn();
    const onDefer = vi.fn();
    const stop = subscribeRealtimeSse({
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      getFormDirty: () => false,
      onRefresh,
      onDefer,
    });

    const source = lastSource();
    expect(source.url).toBe(REALTIME_SSE_PATH);
    expect(source.withCredentials).toBe(true);

    source.emit(RealtimeEventType.ActivityCreated, { lastEventId: "12" });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onDefer).not.toHaveBeenCalled();

    source.emit(RealtimeEventType.ActivityCreated, { lastEventId: "12" });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    stop();
  });

  it("does not refresh when the form is dirty; caller should show the banner", () => {
    const onRefresh = vi.fn();
    const onDefer = vi.fn();
    const stop = subscribeRealtimeSse({
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      getFormDirty: () => true,
      onRefresh,
      onDefer,
    });

    lastSource().emit(RealtimeEventType.ActivityStatusChanged, { lastEventId: "3" });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onDefer).toHaveBeenCalledTimes(1);
    expect(REMOTE_UPDATE_BANNER).toContain("recarregar pode descartar sua edição");

    stop();
  });

  it("on resync refreshes a clean page and reconnects without Last-Event-ID", () => {
    const onRefresh = vi.fn();
    const stop = subscribeRealtimeSse({
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      getFormDirty: () => false,
      onRefresh,
      onDefer: vi.fn(),
    });

    lastSource().emit(RealtimeEventType.ActivityUpdated, { lastEventId: "40" });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    const beforeResync = lastSource();
    beforeResync.emit("resync");
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(beforeResync.readyState).toBe(FakeEventSource.CLOSED);

    const reconnected = lastSource();
    expect(reconnected).not.toBe(beforeResync);
    expect(reconnected.url).toBe(REALTIME_SSE_PATH);
    expect(reconnected.withCredentials).toBe(true);

    stop();
  });

  it("on resync with a dirty form defers refresh and still drops the cursor", () => {
    const onRefresh = vi.fn();
    const onDefer = vi.fn();
    const stop = subscribeRealtimeSse({
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      getFormDirty: () => true,
      onRefresh,
      onDefer,
    });

    lastSource().emit("resync");
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onDefer).toHaveBeenCalledTimes(1);
    expect(lastSource().url).toBe(REALTIME_SSE_PATH);

    stop();
  });

  it("recreates a CLOSED EventSource with lastEventId so replay can resume", () => {
    vi.useFakeTimers();
    const stop = subscribeRealtimeSse({
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      getFormDirty: () => false,
      onRefresh: vi.fn(),
      onDefer: vi.fn(),
      retryMs: 3000,
    });

    const first = lastSource();
    first.emit(RealtimeEventType.ActivityChecklistChanged, { lastEventId: "77" });
    first.readyState = FakeEventSource.CLOSED;
    first.emit("error");

    vi.advanceTimersByTime(3000);
    const recreated = lastSource();
    expect(recreated).not.toBe(first);
    expect(recreated.url).toBe(`${REALTIME_SSE_PATH}?lastEventId=77`);
    expect(recreated.withCredentials).toBe(true);

    stop();
  });
});
