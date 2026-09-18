import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "@/infrastructure/db/create-prisma-client";
import type { PrismaClient } from "@/generated/prisma/client";
import { importTestData } from "./import-test-data";
import { testDataSchema } from "./test-data";

// Never falls back to DATABASE_URL: the user's .env can point at Vercel.
const url = process.env.TEST_IMPORT_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.pathname !== "/fixture_import") {
    throw new Error("Import tests require an isolated local database named fixture_import.");
  }
}
const fixture = () => testDataSchema.parse(JSON.parse(readFileSync("docs/massa-dados.normalizada.json", "utf8")));

describe.skipIf(!url)("test data import (isolated postgres)", () => {
  let prisma: PrismaClient;
  beforeAll(() => { prisma = createPrismaClient(url!); });
  afterAll(async () => { await prisma?.$disconnect(); });
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.auditEvent.deleteMany(), prisma.realtimeEvent.deleteMany(),
      prisma.activityTask.deleteMany(), prisma.activityParticipant.deleteMany(), prisma.activityInvolvedArea.deleteMany(),
      prisma.activity.deleteMany(), prisma.valueDelivery.deleteMany(), prisma.projectParticipant.deleteMany(),
      prisma.project.deleteMany(), prisma.area.deleteMany(), prisma.architectureDomain.deleteMany(), prisma.user.deleteMany(),
    ]);
    for (const email of new Set(fixture().activities.map((a) => a.ownerEmail))) {
      await prisma.user.create({ data: { email, oidcIssuer: "https://fixture.invalid", oidcSubject: email } });
    }
  });

  it("dry-run does not write; apply is audited and idempotent even concurrently", async () => {
    const data = fixture();
    const dry = await importTestData(prisma, data);
    expect(dry.outcome).toBe("dry-run");
    expect(await prisma.area.count()).toBe(0);
    expect(await prisma.project.count()).toBe(0);
    expect(await prisma.auditEvent.count()).toBe(0);
    const notify = vi.fn(async (ids: readonly bigint[]) => {
      // The callback observes committed rows from a separate connection.
      expect(await prisma.activity.count()).toBe(47);
      expect(await prisma.realtimeEvent.count()).toBe(ids.length);
    });
    const outcomes = await Promise.allSettled([
      importTestData(prisma, data, { apply: true, notify }),
      importTestData(prisma, data, { apply: true, notify }),
    ]);
    expect(outcomes.some((o) => o.status === "fulfilled" && o.value.outcome === "imported")).toBe(true);
    for (const outcome of outcomes) {
      if (outcome.status === "rejected") expect(outcome.reason.message).toContain("Outra importação");
      else expect(outcome.value.notificationWarning).toBe(false);
    }
    expect(notify).toHaveBeenCalledTimes(1);
    expect(await prisma.activity.count()).toBe(47);
    expect(await prisma.project.count()).toBe(41);
    expect(await prisma.activityTask.count()).toBe(18);
    expect(await prisma.auditEvent.count({ where: { entityKind: "Activity", action: "created" } })).toBe(47);
    const again = await importTestData(prisma, data, { apply: true });
    expect(again.outcome).toBe("already-imported");
    expect(await prisma.activity.count()).toBe(47);
    data.activities[0].title += " edited";
    await expect(importTestData(prisma, data, { apply: true })).rejects.toThrow("conteúdo diferente");
  }, 60_000);

  it("rolls back catalogs, projects, activities and audits if a mid-import mutation fails", async () => {
    let creates = 0;
    const failing = prisma.$extends({ query: { activity: { async create({ args, query }) {
      creates++;
      if (creates === 2) throw new Error("Injected write failure");
      return query(args);
    } } } }) as unknown as PrismaClient;
    const notify = vi.fn();
    await expect(importTestData(failing, fixture(), { apply: true, notify })).rejects.toThrow();
    expect(creates).toBe(2);
    expect(await prisma.area.count()).toBe(0);
    expect(await prisma.project.count()).toBe(0);
    expect(await prisma.activity.count()).toBe(0);
    expect(await prisma.auditEvent.count()).toBe(0);
    expect(await prisma.realtimeEvent.count()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  }, 60_000);

  it("rejects missing and ambiguous active identities without provisioning users", async () => {
    const data = fixture();
    await prisma.user.deleteMany({ where: { email: data.activities[0].ownerEmail } });
    await expect(importTestData(prisma, data, { apply: true })).rejects.toThrow("encontrados 0");
    for (const subject of ["one", "two"]) await prisma.user.create({ data: {
      email: data.activities[0].ownerEmail, oidcIssuer: "https://duplicate.invalid", oidcSubject: subject,
    } });
    await expect(importTestData(prisma, data, { apply: true })).rejects.toThrow("encontrados 2");
    expect(await prisma.project.count()).toBe(0);
  });

  it("preserves existing projects and reports notification failure after a successful commit", async () => {
    const data = fixture();
    const p = data.projects[0];
    const area = await prisma.area.create({ data: { name: p.area, nameNormalized: p.area.toLowerCase() } });
    const user = await prisma.user.findFirstOrThrow();
    const existing = await prisma.project.create({ data: {
      name: p.name, nameNormalized: p.name.toLowerCase(), responsibleAreaId: area.id,
      nature: "STRATEGIC", architectureRole: "RESPONSIBLE", status: "PLANNED",
      description: "Keep this existing content", createdById: user.id, updatedById: user.id,
    } });
    const result = await importTestData(prisma, data, { apply: true, notify: async () => { throw new Error("offline"); } });
    expect(result.outcome).toBe("imported");
    expect(result.notificationWarning).toBe(true);
    expect(await prisma.project.count()).toBe(41);
    expect(await prisma.project.findUnique({ where: { id: existing.id } })).toMatchObject({ description: "Keep this existing content", status: "PLANNED", version: 1 });
  }, 60_000);
});
