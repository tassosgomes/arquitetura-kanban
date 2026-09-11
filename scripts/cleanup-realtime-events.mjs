#!/usr/bin/env node
/**
 * T29 — apaga RealtimeEvent com mais de 7 dias.
 * Idempotente. Recusa SQL que mencione DELETE em audit_events.
 * Não imprime connection string, tokens nem conteúdo de linhas.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const sqlFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../deploy/sql/cleanup-realtime-events.sql",
);

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("cleanup-realtime-events: DATABASE_URL is required");
  process.exit(1);
}

const sql = readFileSync(sqlFile, "utf8");
if (/delete\s+from\s+"?audit_events"?/i.test(sql)) {
  console.error("cleanup-realtime-events: refusing SQL that deletes audit_events");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  const result = await client.query(sql);
  const deleted = result.rows[0]?.deleted_count ?? 0;
  console.log(`cleanup-realtime-events: deleted ${deleted} realtime_event row(s)`);
} catch (error) {
  const message = error instanceof Error ? error.message : "query failed";
  console.error(`cleanup-realtime-events: ${message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
