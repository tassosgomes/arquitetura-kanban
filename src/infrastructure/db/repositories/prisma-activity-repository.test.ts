import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Priority } from "@/domain/catalog/classifications";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";

function activityRow(id: string, title: string, description: string | null = null) {
  return {
    id,
    title,
    description,
    type: ActivityType.AD_HOC,
    status: ActivityStatus.TODO,
    priority: Priority.MEDIUM,
    effort: null,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    startDate: null,
    expectedEndDate: null,
    completedDate: null,
    cancelledDate: null,
    updatedAt: new Date("2026-09-18T12:00:00.000Z"),
    version: 1,
    project: null,
    requestingArea: { id: "area", name: "Financeiro", isActive: true },
    owner: { id: "owner", displayName: "Ana", email: null, isActive: true },
    tasks: [],
  };
}

describe("Prisma activity repository title search", () => {
  it("matches title case- and accent-insensitively, without searching the description", async () => {
    const findMany = vi.fn().mockResolvedValue([
      activityRow("accented", "Relatório de MFA"),
      activityRow("plain", "Relatorio semanal"),
      activityRow("description-only", "Painel operacional", "Relatório detalhado"),
    ]);
    const prisma = { activity: { findMany } } as unknown as PrismaClient;

    const result = await createPrismaActivityRepository(prisma).list({
      titleQuery: "RELATORIO",
    });

    expect(result.map((item) => item.id)).toEqual(["accented", "plain"]);
    expect(findMany).toHaveBeenCalledOnce();
  });
});
