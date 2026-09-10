import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { provisionLocalUser } from "./provision-local-user";

describe("provisionLocalUser (postgres)", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("inserts a new user on first authorized login", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const issuer = `https://t07.test/${suffix}`;
    const now = new Date("2026-09-10T12:00:00.000Z");

    try {
      const outcome = await provisionLocalUser(
        prisma,
        {
          subject: `sub-new-${suffix}`,
          issuer,
          email: `new-${suffix}@example.test`,
          displayName: "T07 New",
        },
        now,
      );

      expect(outcome.status).toBe("active");
      if (outcome.status !== "active") {
        return;
      }
      expect(outcome.user.oidcIssuer).toBe(issuer);
      expect(outcome.user.oidcSubject).toBe(`sub-new-${suffix}`);
      expect(outcome.user.email).toBe(`new-${suffix}@example.test`);
      expect(outcome.user.displayName).toBe("T07 New");
      expect(outcome.user.isActive).toBe(true);
      expect(outcome.user.lastLoginAt?.toISOString()).toBe(now.toISOString());
    } finally {
      await prisma.user.deleteMany({ where: { oidcIssuer: issuer } });
    }
  });

  it("updates email on the same issuer+subject without creating another row", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const issuer = `https://t07.test/${suffix}`;
    const subject = `sub-same-${suffix}`;

    try {
      const first = await provisionLocalUser(prisma, {
        subject,
        issuer,
        email: `old-${suffix}@example.test`,
        displayName: "Before",
      });
      const second = await provisionLocalUser(prisma, {
        subject,
        issuer,
        email: `new-${suffix}@example.test`,
        displayName: "After",
      });

      expect(first.status).toBe("active");
      expect(second.status).toBe("active");
      if (first.status !== "active" || second.status !== "active") {
        return;
      }
      expect(second.user.id).toBe(first.user.id);
      expect(second.user.email).toBe(`new-${suffix}@example.test`);
      expect(second.user.displayName).toBe("After");

      const rows = await prisma.user.count({ where: { oidcIssuer: issuer, oidcSubject: subject } });
      expect(rows).toBe(1);
    } finally {
      await prisma.user.deleteMany({ where: { oidcIssuer: issuer } });
    }
  });

  it("does not merge two subjects that share an email", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const issuer = `https://t07.test/${suffix}`;
    const email = `shared-${suffix}@example.test`;

    try {
      const first = await provisionLocalUser(prisma, {
        subject: `sub-a-${suffix}`,
        issuer,
        email,
        displayName: "A",
      });
      const second = await provisionLocalUser(prisma, {
        subject: `sub-b-${suffix}`,
        issuer,
        email,
        displayName: "B",
      });

      expect(first.status).toBe("active");
      expect(second.status).toBe("active");
      if (first.status !== "active" || second.status !== "active") {
        return;
      }
      expect(first.user.id).not.toBe(second.user.id);
      const rows = await prisma.user.findMany({ where: { email } });
      expect(rows).toHaveLength(2);
    } finally {
      await prisma.user.deleteMany({ where: { oidcIssuer: issuer } });
    }
  });

  it("refuses an inactive user without updating profile or reactivating", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const issuer = `https://t07.test/${suffix}`;
    const subject = `sub-inactive-${suffix}`;
    const frozenAt = new Date("2026-01-01T00:00:00.000Z");

    const created = await prisma.user.create({
      data: {
        oidcIssuer: issuer,
        oidcSubject: subject,
        email: `old-${suffix}@example.test`,
        displayName: "Frozen",
        isActive: false,
        lastLoginAt: frozenAt,
      },
    });

    try {
      const outcome = await provisionLocalUser(
        prisma,
        {
          subject,
          issuer,
          email: `new-${suffix}@example.test`,
          displayName: "Should Not Apply",
        },
        new Date("2026-09-10T12:00:00.000Z"),
      );

      expect(outcome.status).toBe("inactive");
      if (outcome.status !== "inactive") {
        return;
      }
      expect(outcome.user.id).toBe(created.id);
      expect(outcome.user.isActive).toBe(false);
      expect(outcome.user.email).toBe(`old-${suffix}@example.test`);
      expect(outcome.user.displayName).toBe("Frozen");
      expect(outcome.user.lastLoginAt?.toISOString()).toBe(frozenAt.toISOString());
    } finally {
      await prisma.user.delete({ where: { id: created.id } });
    }
  });
});
