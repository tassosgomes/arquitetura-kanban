import { Client } from "pg";
import { REALTIME_CHANNEL } from "@/infrastructure/realtime/constants";

export function getListenConnectionString(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const listen = env.DATABASE_URL_LISTEN?.trim();
  if (listen) {
    return listen;
  }
  const url = env.DATABASE_URL?.trim();
  return url || undefined;
}

export function getNotifyConnectionString(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const url = env.DATABASE_URL?.trim();
  return url || undefined;
}

/**
 * Post-commit signal. Payload is only the decimal `RealtimeEvent.id`.
 * Uses a short-lived client on the query URL (NOTIFY does not need LISTEN).
 */
export async function notifyRealtimeAfterCommit(
  ids: readonly bigint[],
  connectionString: string,
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    for (const id of ids) {
      await client.query("SELECT pg_notify($1, $2)", [REALTIME_CHANNEL, id.toString()]);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function defaultNotifyRealtime(ids: readonly bigint[]): Promise<void> {
  const url = getNotifyConnectionString();
  if (!url || ids.length === 0) {
    return;
  }
  await notifyRealtimeAfterCommit(ids, url);
}
