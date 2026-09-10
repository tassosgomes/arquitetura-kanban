import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import "dotenv/config";
import { ForbiddenError, UnauthorizedError } from "@/domain/errors";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/infrastructure/db/create-prisma-client";
import { requireActiveUserFrom } from "./active-user-guard";

describe("requireActiveUserFrom", () => {
  it("throws UnauthorizedError without a session", async () => {
    await expect(
      requireActiveUserFrom({
        session: null,
        loadUser: async () => {
          throw new Error("must not load a user");
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws ForbiddenError when the local user is inactive and invalidates", async () => {
    const onForbidden = vi.fn(async () => undefined);

    await expect(
      requireActiveUserFrom({
        session: { localUserId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
        loadUser: async () => ({
          id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          oidcIssuer: "https://idp.example.test/oidc",
          oidcSubject: "sub-1",
          email: "ana@example.test",
          displayName: "Ana",
          isActive: false,
        }),
        onForbidden,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(onForbidden).toHaveBeenCalledOnce();
  });

  it("throws ForbiddenError when the User row is gone", async () => {
    await expect(
      requireActiveUserFrom({
        session: { localUserId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
        loadUser: async () => null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns LocalUser with isActive true after a database re-read", async () => {
    const user = await requireActiveUserFrom({
      session: { localUserId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
      loadUser: async (id) => ({
        id,
        oidcIssuer: "https://idp.example.test/oidc",
        oidcSubject: "sub-1",
        email: "ana@example.test",
        displayName: "Ana",
        isActive: true,
      }),
    });

    expect(user).toEqual({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      oidcIssuer: "https://idp.example.test/oidc",
      oidcSubject: "sub-1",
      email: "ana@example.test",
      displayName: "Ana",
      isActive: true,
    });
  });
});

describe("requireActiveUserFrom (postgres)", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return;
    }
    const client = createPrismaClient(url);
    try {
      await client.$queryRaw`SELECT 1`;
      prisma = client;
    } catch {
      await client.$disconnect().catch(() => undefined);
    }
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("re-reads isActive from the database", async ({ skip }) => {
    if (!prisma) {
      skip();
      return;
    }
    const suffix = randomUUID();
    const created = await prisma.user.create({
      data: {
        oidcIssuer: `https://t07.guard/${suffix}`,
        oidcSubject: `sub-${suffix}`,
        displayName: "Guard",
        isActive: true,
      },
    });

    try {
      const active = await requireActiveUserFrom({
        session: { localUserId: created.id },
        loadUser: (id) =>
          prisma!.user.findUnique({
            where: { id },
            select: {
              id: true,
              oidcIssuer: true,
              oidcSubject: true,
              email: true,
              displayName: true,
              isActive: true,
            },
          }),
      });
      expect(active.isActive).toBe(true);

      await prisma.user.update({ where: { id: created.id }, data: { isActive: false } });

      await expect(
        requireActiveUserFrom({
          session: { localUserId: created.id },
          loadUser: (id) =>
            prisma!.user.findUnique({
              where: { id },
              select: {
                id: true,
                oidcIssuer: true,
                oidcSubject: true,
                email: true,
                displayName: true,
                isActive: true,
              },
            }),
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    } finally {
      await prisma.user.delete({ where: { id: created.id } });
    }
  });
});
