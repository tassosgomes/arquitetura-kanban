import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import type { PrismaClient } from "@/generated/prisma/client";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import {
  assertCleanupSqlIsRealtimeOnly,
  cleanupStaleRealtimeEvents,
  loadCleanupRealtimeSql,
} from "@/infrastructure/realtime/cleanup-stale-events";

describe("RealtimeEvent cleanup SQL", () => {
  it("is idempotent in form and never deletes audit_events", () => {
    const sql = loadCleanupRealtimeSql();
    assertCleanupSqlIsRealtimeOnly(sql);
    expect(sql).toMatch(/INTERVAL '7 days'/i);
    expect(sql).not.toMatch(/delete\s+from\s+"?(users|activities|projects)"?/i);
    expect(readFileSync("scripts/cleanup-realtime-events.mjs", "utf8")).toMatch(
      /refusing SQL that deletes audit_events/,
    );
  });
});

describe("RealtimeEvent cleanup (postgres)", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("deletes only stale realtime rows and leaves AuditEvent untouched", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }

    const db = prisma;
    const suffix = randomUUID();
    const user = await db.user.create({
      data: {
        oidcIssuer: `https://t29.cleanup/${suffix}`,
        oidcSubject: `sub-${suffix}`,
        displayName: "T29 cleanup",
      },
    });
    const audit = await db.auditEvent.create({
      data: {
        actorUserId: user.id,
        entityKind: AuditEntityKind.User,
        entityId: user.id,
        action: AuditAction.created,
        changes: { fixture: suffix },
      },
    });
    const fresh = await db.realtimeEvent.create({
      data: {
        type: "catalog.changed",
        payload: { entityKind: "area", entityId: suffix, seq: "fresh" },
      },
    });
    const stale = await db.realtimeEvent.create({
      data: {
        type: "catalog.changed",
        payload: { entityKind: "area", entityId: suffix, seq: "stale" },
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    });

    const executor = {
      query: async (sql: string) => {
        const rows = await db.$queryRawUnsafe<Array<{ deleted_count: bigint }>>(sql);
        return { rows };
      },
    };

    try {
      const first = await cleanupStaleRealtimeEvents(executor);
      expect(first).toBeGreaterThanOrEqual(1n);
      expect(await db.realtimeEvent.findUnique({ where: { id: stale.id } })).toBeNull();
      expect(await db.realtimeEvent.findUnique({ where: { id: fresh.id } })).not.toBeNull();
      expect(await db.auditEvent.findUnique({ where: { id: audit.id } })).not.toBeNull();

      await cleanupStaleRealtimeEvents(executor);
      expect(await db.realtimeEvent.findUnique({ where: { id: fresh.id } })).not.toBeNull();
      expect(await db.auditEvent.findUnique({ where: { id: audit.id } })).not.toBeNull();
    } finally {
      await db.realtimeEvent.deleteMany({
        where: { id: { in: [fresh.id, stale.id] } },
      });
      await db.auditEvent.delete({ where: { id: audit.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  });
});
