import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import type { PrismaClient } from "@/generated/prisma/client";
import { ConflictError, InvariantError } from "@/domain/errors";
import { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import { ProjectStatus } from "@/domain/project/project-status";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import type { LocalUser } from "@/domain/identity/local-user";
import { AuditAction, AuditEntityKind } from "@/domain/audit/audit-entity-kind";
import { VALUE_DELIVERY_AUDIT_FIELDS } from "@/application/audit";
import { cancelProject, createProject } from "@/application/projects";
import type { CreateProjectInput } from "@/application/projects";
import {
  createValueDelivery,
  getValueDelivery,
  listValueDeliveries,
  updateValueDelivery,
} from "@/application/value-deliveries";
import { connectPostgresForTests } from "@/infrastructure/db/connect-postgres-for-tests";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaValueDeliveryRepository } from "@/infrastructure/db/repositories/prisma-value-delivery-repository";

describe("value delivery services (postgres)", () => {
  let prisma: PrismaClient | undefined;
  let actor: LocalUser | undefined;
  const areaIds: string[] = [];
  const userIds: string[] = [];
  const projectIds: string[] = [];
  const deliveryIds: string[] = [];

  beforeAll(async () => {
    prisma = await connectPostgresForTests();
    if (!prisma) {
      return;
    }

    const user = await prisma.user.create({
      data: {
        oidcIssuer: `https://t23.test/${randomUUID()}`,
        oidcSubject: "t23-actor",
        displayName: "T23 actor",
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
    await prisma.valueDelivery.deleteMany({ where: { id: { in: deliveryIds } } });
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
      valueDeliveries: createPrismaValueDeliveryRepository(prisma),
      projects: createPrismaProjectRepository(prisma),
      prisma,
    };
  }

  function projectDeps() {
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

  async function createArea(suffix: string) {
    if (!prisma) {
      throw new Error("prisma is required");
    }
    const area = await prisma.area.create({
      data: {
        name: `T23 Área ${suffix}`,
        nameNormalized: normalizeCatalogName(`T23 Área ${suffix}`),
      },
    });
    areaIds.push(area.id);

    return { area };
  }

  function projectInput(
    areaId: string,
    name: string,
    overrides: Partial<CreateProjectInput> = {},
  ): CreateProjectInput {
    return {
      name,
      description: null,
      responsibleAreaId: areaId,
      externalResponsible: null,
      participantIds: [],
      architectureRole: ArchitectureRole.RESPONSIBLE,
      nature: Nature.STRATEGIC,
      startDate: null,
      expectedEndDate: null,
      status: ProjectStatus.PLANNED,
      ...overrides,
    };
  }

  it("creates a delivery with author, timestamps and audit snapshot", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area } = await createArea(suffix);
    const project = await createProject(
      actor,
      projectInput(area.id, `T23 Projeto ${suffix}`),
      projectDeps(),
    );
    projectIds.push(project.id);

    const created = await createValueDelivery(
      actor,
      {
        projectId: project.id,
        title: "Revisão da arquitetura de integração",
        contentMarkdown: "## Valor entregue\n\n- Padrão de APIs",
        referenceDate: "2026-09-10",
      },
      deps(),
    );
    deliveryIds.push(created.id);

    expect(created.title).toBe("Revisão da arquitetura de integração");
    expect(created.contentMarkdown).toContain("Padrão de APIs");
    expect(created.referenceDate).toBe("2026-09-10");
    expect(created.author.id).toBe(actor.id);
    expect(created.version).toBe(1);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);

    const events = await prisma.auditEvent.findMany({ where: { entityId: created.id } });
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe(AuditAction.created);
    expect(events[0]?.entityKind).toBe(AuditEntityKind.ValueDelivery);
    expect(events[0]?.projectId).toBe(project.id);
    expect(events[0]?.changes).toMatchObject({
      snapshot: {
        title: created.title,
        referenceDate: "2026-09-10",
        projectId: project.id,
        authorId: actor.id,
      },
    });
  });

  it("does not change project metadata or status when a delivery is created or edited (RN-18)", async ({
    skip,
  }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area } = await createArea(suffix);
    const project = await createProject(
      actor,
      projectInput(area.id, `T23 RN18 ${suffix}`, {
        status: ProjectStatus.IN_PROGRESS,
      }),
      projectDeps(),
    );
    projectIds.push(project.id);

    const before = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    const projectEventsBefore = await prisma.auditEvent.count({
      where: { entityKind: "Project", entityId: project.id },
    });

    const created = await createValueDelivery(
      actor,
      {
        projectId: project.id,
        title: "Entrega RN-18",
        contentMarkdown: "Conteúdo inicial",
        referenceDate: "2026-08-01",
      },
      deps(),
    );
    deliveryIds.push(created.id);

    const afterCreate = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(afterCreate.status).toBe(before.status);
    expect(afterCreate.version).toBe(before.version);
    expect(afterCreate.name).toBe(before.name);
    expect(afterCreate.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    await updateValueDelivery(
      actor,
      {
        id: created.id,
        version: created.version,
        title: "Entrega RN-18 atualizada",
        contentMarkdown: "Conteúdo editado",
        referenceDate: "2026-08-15",
      },
      deps(),
    );

    const afterUpdate = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(afterUpdate.status).toBe(before.status);
    expect(afterUpdate.version).toBe(before.version);
    expect(afterUpdate.name).toBe(before.name);
    expect(afterUpdate.updatedAt.getTime()).toBe(before.updatedAt.getTime());

    const projectEventsAfter = await prisma.auditEvent.count({
      where: { entityKind: "Project", entityId: project.id },
    });
    expect(projectEventsAfter).toBe(projectEventsBefore);
  });

  it("rejects a stale version without overwriting", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area } = await createArea(suffix);
    const project = await createProject(
      actor,
      projectInput(area.id, `T23 Conflito ${suffix}`),
      projectDeps(),
    );
    projectIds.push(project.id);

    const created = await createValueDelivery(
      actor,
      {
        projectId: project.id,
        title: "Original",
        contentMarkdown: "Versão 1",
        referenceDate: "2026-09-01",
      },
      deps(),
    );
    deliveryIds.push(created.id);

    const firstEdit = await updateValueDelivery(
      actor,
      {
        id: created.id,
        version: created.version,
        title: "Segunda versão",
        contentMarkdown: "Versão 2",
        referenceDate: "2026-09-02",
      },
      deps(),
    );
    expect(firstEdit.version).toBe(created.version + 1);

    await expect(
      updateValueDelivery(
        actor,
        {
          id: created.id,
          version: created.version,
          title: "não deve persistir",
          contentMarkdown: "overwrite",
          referenceDate: "2026-01-01",
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    const persisted = await prisma.valueDelivery.findUnique({ where: { id: created.id } });
    expect(persisted?.title).toBe("Segunda versão");
    expect(persisted?.contentMarkdown).toBe("Versão 2");
    expect(persisted?.version).toBe(firstEdit.version);
  });

  it("keeps cancelled projects read-only for create and edit", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area } = await createArea(suffix);
    const project = await createProject(
      actor,
      projectInput(area.id, `T23 Cancelado ${suffix}`),
      projectDeps(),
    );
    projectIds.push(project.id);

    const created = await createValueDelivery(
      actor,
      {
        projectId: project.id,
        title: "Antes do cancelamento",
        contentMarkdown: "Conteúdo",
        referenceDate: "2026-09-10",
      },
      deps(),
    );
    deliveryIds.push(created.id);

    await cancelProject(actor, { id: project.id, version: project.version }, projectDeps());

    await expect(
      createValueDelivery(
        actor,
        {
          projectId: project.id,
          title: "Depois",
          contentMarkdown: "Não deve criar",
          referenceDate: "2026-09-11",
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(InvariantError);

    await expect(
      updateValueDelivery(
        actor,
        {
          id: created.id,
          version: created.version,
          title: "Tentativa",
          contentMarkdown: "Não deve editar",
          referenceDate: "2026-09-12",
        },
        deps(),
      ),
    ).rejects.toBeInstanceOf(InvariantError);

    const listed = await listValueDeliveries(actor, project.id, deps().valueDeliveries);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.title).toBe("Antes do cancelamento");
  });

  it("lists deliveries of one project and ignores another project's id", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area } = await createArea(suffix);
    const first = await createProject(
      actor,
      projectInput(area.id, `T23 Lista A ${suffix}`),
      projectDeps(),
    );
    const second = await createProject(
      actor,
      projectInput(area.id, `T23 Lista B ${suffix}`),
      projectDeps(),
    );
    projectIds.push(first.id, second.id);

    const delivery = await createValueDelivery(
      actor,
      {
        projectId: first.id,
        title: "Só no A",
        contentMarkdown: "Markdown",
        referenceDate: "2026-09-10",
      },
      deps(),
    );
    deliveryIds.push(delivery.id);

    const listed = await listValueDeliveries(actor, first.id, deps().valueDeliveries);
    expect(listed.map((item) => item.id)).toEqual([delivery.id]);

    const missing = await getValueDelivery(actor, second.id, delivery.id, deps().valueDeliveries);
    expect(missing).toBeNull();
  });

  it("stores raw markdown including script tags (sanitization is render-time)", async ({ skip }) => {
    if (!prisma || !actor) {
      skip();
      return;
    }

    const suffix = randomUUID();
    const { area } = await createArea(suffix);
    const project = await createProject(
      actor,
      projectInput(area.id, `T23 XSS store ${suffix}`),
      projectDeps(),
    );
    projectIds.push(project.id);

    const payload = "<script>alert(1)</script>\n[xss](javascript:alert(1))";
    const created = await createValueDelivery(
      actor,
      {
        projectId: project.id,
        title: "Payload",
        contentMarkdown: payload,
        referenceDate: "2026-09-10",
      },
      deps(),
    );
    deliveryIds.push(created.id);

    expect(created.contentMarkdown).toBe(payload);
    const changes = await prisma.auditEvent.findFirst({ where: { entityId: created.id } });
    const snapshot = (changes?.changes as { snapshot?: Record<string, unknown> }).snapshot;
    expect(snapshot?.contentMarkdown).toBe(payload);
    expect(Object.keys(snapshot ?? {})).toEqual(expect.arrayContaining([...VALUE_DELIVERY_AUDIT_FIELDS]));
  });
});
