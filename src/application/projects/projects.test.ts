import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ConflictError, InvariantError, ValidationError } from "@/domain/errors";
import { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import { ProjectStatus } from "@/domain/project/project-status";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import {
  cancelProject,
  createProject,
  getProject,
  updateProject,
} from "@/application/projects";
import type { CreateProjectInput } from "@/application/projects";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";

describe("project services (postgres)", () => {
  let prisma: PrismaClient | undefined;
  let actor: LocalUser | undefined;
  const areaIds: string[] = [];
  const userIds: string[] = [];
  const projectIds: string[] = [];

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
    if (!prisma) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t11.test/${randomUUID()}`,
        oidcSubject: "t11-actor",
        displayName: "T11 actor",
        isActive: true,
      },
    });
    userIds.push(user.id);
    actor = {
      id: user.id,
      oidcIssuer: user.oidcIssuer,
      oidcSubject: user.oidcSubject,
      isActive: true,
    };
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [{ projectId: { in: projectIds } }, { actorUserId: { in: userIds } }],
      },
    });
    await prisma.projectParticipant.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.area.deleteMany({ where: { id: { in: areaIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  function deps() {
    if (!prisma) {
      throw new Error("prisma is required");
    }
    return {
      projects: createPrismaProjectRepository(prisma),
      areas: createPrismaAreaRepository(prisma),
      users: createPrismaCatalogUserRepository(prisma),
      prisma,
    };
  }

  async function createAreaAndOwner(suffix: string) {
    if (!prisma) {
      throw new Error("prisma is required");
    }
    const area = await prisma.area.create({
      data: {
        name: `T11 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T11 Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    const owner = await prisma.user.create({
      data: {
        oidcIssuer: `https://t11.test/${suffix}`,
        oidcSubject: `owner-${suffix}`,
        displayName: `Owner ${suffix}`,
        isActive: true,
      },
    });
    userIds.push(owner.id);

    return { area, owner };
  }

  function requiredInput(
    areaId: string,
    ownerId: string,
    name: string,
    overrides: Partial<CreateProjectInput> = {},
  ): CreateProjectInput {
    return {
      name,
      description: null,
      responsibleAreaId: areaId,
      externalResponsible: null,
      architectureOwnerId: ownerId,
      participantIds: [],
      architectureRole: ArchitectureRole.RESPONSIBLE,
      nature: Nature.STRATEGIC,
      startDate: null,
      expectedEndDate: null,
      status: ProjectStatus.PLANNED,
      ...overrides,
    };
  }

  it("creates a project with required fields and an audit snapshot", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, owner } = await createAreaAndOwner(suffix);
    const created = await createProject(
      actor,
      requiredInput(area.id, owner.id, `T11 Projeto ${suffix}`),
      deps(),
    );
    projectIds.push(created.id);

    expect(created.name).toBe(`T11 Projeto ${suffix}`);
    expect(created.status).toBe(ProjectStatus.PLANNED);
    expect(created.responsibleArea.id).toBe(area.id);
    expect(created.architectureOwner.id).toBe(owner.id);
    expect(created.version).toBe(1);
    expect(created.createdBy.id).toBe(actor.id);

    const events = await prisma.auditEvent.findMany({ where: { entityId: created.id } });
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe(AuditAction.created);
    expect(events[0]?.entityKind).toBe(AuditEntityKind.Project);
    expect(events[0]?.changes).toMatchObject({
      snapshot: { name: created.name, status: "PLANNED" },
    });
  });

  it("rejects a duplicate active name after normalization", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, owner } = await createAreaAndOwner(suffix);
    const name = `T11 Duplicado ${suffix}`;
    const first = await createProject(actor, requiredInput(area.id, owner.id, name), deps());
    projectIds.push(first.id);

    await expect(
      createProject(actor, requiredInput(area.id, owner.id, ` ${name.toUpperCase()} `), deps()),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("cancel does not delete and frees the active name", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, owner } = await createAreaAndOwner(suffix);
    const name = `T11 ERP ${suffix}`;
    const first = await createProject(actor, requiredInput(area.id, owner.id, name), deps());
    projectIds.push(first.id);

    const cancelled = await cancelProject(actor, { id: first.id, version: first.version }, deps());
    expect(cancelled.status).toBe(ProjectStatus.CANCELLED);

    const stillThere = await prisma.project.findUnique({ where: { id: first.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.status).toBe("CANCELLED");

    const second = await createProject(actor, requiredInput(area.id, owner.id, name), deps());
    projectIds.push(second.id);
    expect(second.status).toBe(ProjectStatus.PLANNED);
    expect(second.id).not.toBe(first.id);

    const loaded = await getProject(actor, first.id, deps().projects);
    expect(loaded?.status).toBe(ProjectStatus.CANCELLED);
  });

  it("stores project status independently of activities", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, owner } = await createAreaAndOwner(suffix);
    const created = await createProject(
      actor,
      requiredInput(area.id, owner.id, `T11 Status ${suffix}`, {
        status: ProjectStatus.IN_PROGRESS,
      }),
      deps(),
    );
    projectIds.push(created.id);

    const completed = await updateProject(
      actor,
      {
        id: created.id,
        version: created.version,
        name: created.name,
        description: created.description,
        responsibleAreaId: created.responsibleArea.id,
        externalResponsible: created.externalResponsible,
        architectureOwnerId: created.architectureOwner.id,
        participantIds: [],
        architectureRole: created.architectureRole,
        nature: created.nature,
        startDate: created.startDate,
        expectedEndDate: created.expectedEndDate,
        status: ProjectStatus.COMPLETED,
      },
      deps(),
    );

    expect(completed.status).toBe(ProjectStatus.COMPLETED);
    const activityCount = await prisma.activity.count({ where: { projectId: created.id } });
    expect(activityCount).toBe(0);
  });

  it("rejects a stale version without overwriting", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, owner } = await createAreaAndOwner(suffix);
    const created = await createProject(
      actor,
      requiredInput(area.id, owner.id, `T11 Conflito ${suffix}`),
      deps(),
    );
    projectIds.push(created.id);

    const firstEdit = await updateProject(
      actor,
      {
        id: created.id,
        version: created.version,
        name: `T11 Conflito v2 ${suffix}`,
        description: null,
        responsibleAreaId: area.id,
        externalResponsible: null,
        architectureOwnerId: owner.id,
        participantIds: [],
        architectureRole: ArchitectureRole.RESPONSIBLE,
        nature: Nature.STRATEGIC,
        startDate: null,
        expectedEndDate: null,
        status: ProjectStatus.IN_PROGRESS,
      },
      deps(),
    );
    expect(firstEdit.version).toBe(created.version + 1);

    await expect(
      updateProject(
        actor,
        {
          id: created.id,
          version: created.version,
          name: "não deve persistir",
          description: null,
          responsibleAreaId: area.id,
          externalResponsible: null,
          architectureOwnerId: owner.id,
          participantIds: [],
          architectureRole: ArchitectureRole.CONTRIBUTOR,
          nature: Nature.OPERATIONAL,
          startDate: null,
          expectedEndDate: null,
          status: ProjectStatus.PLANNED,
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    const persisted = await prisma.project.findUnique({ where: { id: created.id } });
    expect(persisted?.name).toBe(`T11 Conflito v2 ${suffix}`);
    expect(persisted?.status).toBe("IN_PROGRESS");
    expect(persisted?.version).toBe(firstEdit.version);
  });

  it("does not allow editing a cancelled project", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, owner } = await createAreaAndOwner(suffix);
    const created = await createProject(
      actor,
      requiredInput(area.id, owner.id, `T11 Terminal ${suffix}`),
      deps(),
    );
    projectIds.push(created.id);
    const cancelled = await cancelProject(actor, { id: created.id, version: created.version }, deps());

    await expect(
      updateProject(
        actor,
        {
          id: cancelled.id,
          version: cancelled.version,
          name: cancelled.name,
          description: "tentativa",
          responsibleAreaId: area.id,
          externalResponsible: null,
          architectureOwnerId: owner.id,
          participantIds: [],
          architectureRole: ArchitectureRole.RESPONSIBLE,
          nature: Nature.STRATEGIC,
          startDate: null,
          expectedEndDate: null,
          status: ProjectStatus.PLANNED,
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(InvariantError);
  });

  it("rejects an inactive user as a new owner", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area, owner } = await createAreaAndOwner(suffix);
    await prisma.user.update({ where: { id: owner.id }, data: { isActive: false } });

    await expect(
      createProject(actor, requiredInput(area.id, owner.id, `T11 Inativo ${suffix}`), deps()),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
