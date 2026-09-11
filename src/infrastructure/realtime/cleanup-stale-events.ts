import { readFileSync } from "node:fs";
import path from "node:path";
import { REALTIME_RETENTION_DAYS } from "@/infrastructure/realtime/constants";

export const CLEANUP_REALTIME_SQL_RELATIVE_PATH = "deploy/sql/cleanup-realtime-events.sql";

export function loadCleanupRealtimeSql(cwd = process.cwd()): string {
  return readFileSync(path.join(cwd, CLEANUP_REALTIME_SQL_RELATIVE_PATH), "utf8");
}

export function assertCleanupSqlIsRealtimeOnly(sql: string): void {
  if (!/delete\s+from\s+"realtime_event"/i.test(sql)) {
    throw new Error("cleanup SQL must DELETE FROM \"realtime_event\"");
  }
  if (!sql.includes(`${REALTIME_RETENTION_DAYS} days`)) {
    throw new Error(`cleanup SQL must retain ${REALTIME_RETENTION_DAYS} days`);
  }
  if (/delete\s+from\s+"?audit_events"?/i.test(sql)) {
    throw new Error("cleanup SQL must never DELETE FROM audit_events");
  }
}

export type SqlExecutor = {
  query: (sql: string) => Promise<{ rows: Array<{ deleted_count?: bigint | number | string }> }>;
};

/** Runs the versioned SQL. Idempotent. Never targets AuditEvent. */
export async function cleanupStaleRealtimeEvents(executor: SqlExecutor): Promise<bigint> {
  const sql = loadCleanupRealtimeSql();
  assertCleanupSqlIsRealtimeOnly(sql);
  const result = await executor.query(sql);
  const raw = result.rows[0]?.deleted_count ?? 0;
  return typeof raw === "bigint" ? raw : BigInt(raw);
}
