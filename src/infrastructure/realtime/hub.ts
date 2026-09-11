import { Client } from "pg";
import { REALTIME_CHANNEL, realtimeRetentionStart } from "@/infrastructure/realtime/constants";
import type { PersistedRealtimeEvent, RealtimeEventStore } from "@/infrastructure/realtime/types";

export type RealtimeHubPort = {
  ensureListening(): Promise<void>;
  subscribe(listener: (event: PersistedRealtimeEvent) => void): () => void;
};

export type RealtimeHubOptions = {
  connectionString: string;
  store: RealtimeEventStore;
  channel?: string;
  now?: () => Date;
};

/**
 * One `pg.Client` LISTEN per Node process. Fan-in to every SSE stream on this isolate.
 * Aborting a browser connection must not UNLISTEN (other tabs may share the process).
 * Every replica LISTENs on the same PostgreSQL channel — there is no in-memory bus across pods.
 */
export class RealtimeHub implements RealtimeHubPort {
  private client: Client | null = null;
  private connecting: Promise<void> | null = null;
  private readonly subscribers = new Set<(event: PersistedRealtimeEvent) => void>();
  private lastSeenId = 0n;
  private closed = false;
  private readonly channel: string;
  private readonly connectionString: string;
  private readonly store: RealtimeEventStore;
  private readonly now: () => Date;

  constructor(options: RealtimeHubOptions) {
    this.connectionString = options.connectionString;
    this.store = options.store;
    this.channel = options.channel ?? REALTIME_CHANNEL;
    this.now = options.now ?? (() => new Date());
  }

  subscribe(listener: (event: PersistedRealtimeEvent) => void): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  async ensureListening(): Promise<void> {
    if (this.closed || this.client) {
      return;
    }
    if (this.connecting) {
      await this.connecting;
      return;
    }
    this.connecting = this.connect();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    const client = this.client;
    this.client = null;
    this.connecting = null;
    if (client) {
      await client.end().catch(() => undefined);
    }
  }

  private async connect(): Promise<void> {
    const client = new Client({ connectionString: this.connectionString });
    client.on("notification", (message) => {
      void this.onNotification(message.channel, message.payload);
    });
    client.on("error", () => {
      this.client = null;
      if (!this.closed) {
        void this.reconnect();
      }
    });
    client.on("end", () => {
      if (this.client === client) {
        this.client = null;
      }
    });
    await client.connect();
    await client.query(`LISTEN ${this.channel}`);
    this.client = client;

    if (this.lastSeenId === 0n) {
      this.lastSeenId = (await this.store.maxId()) ?? 0n;
    } else {
      await this.catchUp();
    }
  }

  private async reconnect(): Promise<void> {
    if (this.closed) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      await this.ensureListening();
    } catch {
      /* next SSE heartbeat / ensureListening retries */
    }
  }

  private async catchUp(): Promise<void> {
    const missed = await this.store.listAfter(
      this.lastSeenId,
      realtimeRetentionStart(this.now()),
    );
    for (const event of missed) {
      this.emit(event);
    }
  }

  private async onNotification(channel: string, payload: string | undefined): Promise<void> {
    if (channel !== this.channel || !payload) {
      return;
    }
    if (!/^[1-9][0-9]*$/.test(payload)) {
      return;
    }
    const id = BigInt(payload);
    const event = await this.store.findById(id);
    if (!event) {
      return;
    }
    this.emit(event);
  }

  private emit(event: PersistedRealtimeEvent): void {
    if (event.id > this.lastSeenId) {
      this.lastSeenId = event.id;
    }
    for (const listener of this.subscribers) {
      listener(event);
    }
  }
}

const globalForHub = globalThis as unknown as {
  realtimeHub?: RealtimeHub;
};

export function getProcessRealtimeHub(options: RealtimeHubOptions): RealtimeHub {
  if (!globalForHub.realtimeHub) {
    globalForHub.realtimeHub = new RealtimeHub(options);
  }
  return globalForHub.realtimeHub;
}
