import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { LocalUser } from "@/domain/identity/local-user";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";
import { createArea } from "@/application/catalogs/commands/create-area";
import { createDomain } from "@/application/catalogs/commands/create-domain";
import { createProject } from "@/application/projects/commands/create-project";
import { createProjectSchema } from "@/application/projects/schemas";
import { createActivity } from "@/application/activities/commands/create-activity";
import { addActivityTask } from "@/application/activities/commands/activity-checklist";
import { createActivitySchema } from "@/application/activities/schemas";
import type { AuditedPrismaClient } from "@/infrastructure/db/audited-transaction";
import { createPrismaAreaRepository } from "@/infrastructure/db/repositories/prisma-area-repository";
import { createPrismaDomainRepository } from "@/infrastructure/db/repositories/prisma-domain-repository";
import { createPrismaCatalogUserRepository } from "@/infrastructure/db/repositories/prisma-catalog-user-repository";
import { createPrismaProjectRepository } from "@/infrastructure/db/repositories/prisma-project-repository";
import { createPrismaActivityRepository } from "@/infrastructure/db/repositories/prisma-activity-repository";
import { summarizeTestData, testDataHash, testDataSchema, type TestData } from "./test-data";

const MARKER_ACTION = "test_data_imported";
const PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000001";

function projectInput(p: TestData["projects"][number], areaId: string) {
  return createProjectSchema.parse({
    name: p.name, responsibleAreaId: areaId, nature: p.nature,
    architectureRole: p.architectureRole, status: p.status,
    description: "Projeto da massa de teste normalizada; classificações fictícias.",
  });
}

function activityInput(a: TestData["activities"][number], ids: { project: string; area: string; domain: string; owner: string }, batchId: string) {
  return createActivitySchema.parse({
    ...a, type: "PROJECT", projectId: ids.project, requestingAreaId: ids.area,
    domainId: ids.domain, ownerId: ids.owner,
    startDate: a.startDate ?? "", expectedEndDate: a.expectedEndDate ?? "", completedDate: a.completedDate ?? "",
    observations: `${a.observations}\n\n[Massa de teste: ${batchId}/${a.key}; datas fictícias; origem: docs/massa-dados.txt:${a.sourceLine}]`.trim(),
  });
}

async function plan(tx: Prisma.TransactionClient, data: TestData) {
  const previous = await tx.auditEvent.findFirst({
    where: { action: MARKER_ACTION, changes: { path: ["batchId"], equals: data.batchId } },
  });
  if (previous) {
    const changes = previous.changes as { hash?: string };
    if (changes.hash !== testDataHash(data)) throw new Error("Este lote já foi importado com conteúdo diferente. Não será reaplicado nem sobrescrito.");
    return { alreadyImported: true as const };
  }
  const emails = [...new Set([data.actorEmail, ...data.activities.map((a) => a.ownerEmail)])];
  const users = new Map<string, LocalUser>();
  for (const email of emails) {
    const matches = await tx.user.findMany({ where: { email: { equals: email, mode: "insensitive" }, isActive: true } });
    if (matches.length !== 1) throw new Error(`${email}: esperado exatamente um usuário ativo, encontrados ${matches.length}. Faça login no ambiente ou resolva a ambiguidade de identidade.`);
    const user = matches[0];
    users.set(email, { id: user.id, oidcIssuer: user.oidcIssuer, oidcSubject: user.oidcSubject, email, isActive: true });
  }
  const areas = new Map<string, string | null>();
  const domains = new Map<string, string | null>();
  for (const name of new Set([...data.projects.map((p) => p.area), ...data.activities.map((a) => a.area)])) {
    const existing = await tx.area.findMany({ where: { nameNormalized: normalizeCatalogName(name) } });
    const active = existing.find((a) => a.isActive);
    if (!active && existing.length) throw new Error(`Área inativa: ${name}. Revise o cadastro antes da carga.`);
    areas.set(name, active?.id ?? null);
  }
  for (const name of new Set(data.activities.map((a) => a.domain))) {
    const existing = await tx.architectureDomain.findMany({ where: { nameNormalized: normalizeCatalogName(name) } });
    const active = existing.find((d) => d.isActive);
    if (!active && existing.length) throw new Error(`Categoria inativa: ${name}. Revise o cadastro antes da carga.`);
    domains.set(name, active?.id ?? null);
  }
  const projects = new Map<string, string | null>();
  for (const p of data.projects) {
    const existing = await tx.project.findFirst({ where: { nameNormalized: normalizeCatalogName(p.name), status: { not: "CANCELLED" } } });
    if (existing && existing.responsibleAreaId !== areas.get(p.area)) throw new Error(`Projeto existente com outra área: ${p.name}. Revise o mapeamento.`);
    projects.set(p.key, existing?.id ?? null);
    projectInput(p, areas.get(p.area) ?? PLACEHOLDER_ID);
  }
  for (const a of data.activities) activityInput(a, {
    project: projects.get(a.projectKey) ?? PLACEHOLDER_ID,
    area: areas.get(a.area) ?? PLACEHOLDER_ID,
    domain: domains.get(a.domain) ?? PLACEHOLDER_ID,
    owner: users.get(a.ownerEmail)!.id,
  }, data.batchId);
  return { alreadyImported: false as const, users, areas, domains, projects };
}

/** All writes (including the batch receipt) commit together. Dry-run performs only reads. */
export async function importTestData(
  prisma: PrismaClient,
  input: unknown,
  options: { apply?: boolean; notify?: (ids: readonly bigint[]) => Promise<void> } = {},
) {
  const data = testDataSchema.parse(input);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (data.referenceDate > today) throw new Error("A data de referência não pode estar no futuro.");
  const realtimeIds: bigint[] = [];
  const result = await prisma.$transaction(async (tx) => {
    if (options.apply) {
      // Global fixture lock covers concurrent applies even when their JSON differs.
      // pg_try_* avoids waiting through a long remote import.
      const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(73219041) AS acquired`;
      if (!lock.acquired) throw new Error("Outra importação está em andamento. Tente novamente após sua conclusão.");
    } else {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    }
    const p = await plan(tx, data);
    const summary = summarizeTestData(data);
    if (p.alreadyImported) return { ...summary, outcome: "already-imported" as const };
    const changes = {
      newAreas: [...p.areas.entries()].filter(([, id]) => !id).map(([name]) => name),
      newDomains: [...p.domains.entries()].filter(([, id]) => !id).map(([name]) => name),
      newProjects: data.projects.filter((project) => !p.projects.get(project.key)).map((project) => project.name),
      reusedProjects: data.projects.filter((project) => p.projects.get(project.key)).map((project) => project.name),
    };
    if (!options.apply) return { ...summary, ...changes, outcome: "dry-run" as const };

    // The commands only use callback transactions. This adapter joins the outer
    // transaction instead of opening nested Prisma transactions, and queues NOTIFY.
    const batch: AuditedPrismaClient = {
      $transaction: (async (callback: (client: Prisma.TransactionClient) => Promise<unknown>) => callback(tx)) as PrismaClient["$transaction"],
      notifyRealtime: async (ids) => { realtimeIds.push(...ids); },
    };
    const actor = p.users.get(data.actorEmail)!;
    const areas = createPrismaAreaRepository(prisma);
    const domains = createPrismaDomainRepository(prisma);
    const users = createPrismaCatalogUserRepository(prisma);
    const projects = createPrismaProjectRepository(prisma);
    const activities = createPrismaActivityRepository(prisma);
    for (const [name, id] of p.areas) if (!id) p.areas.set(name, (await createArea(actor, { name }, areas, batch)).id);
    for (const [name, id] of p.domains) if (!id) p.domains.set(name, (await createDomain(actor, { name }, domains, batch)).id);
    for (const project of data.projects) {
      if (!p.projects.get(project.key)) {
        const record = await createProject(actor, projectInput(project, p.areas.get(project.area)!), { projects, areas, users, prisma: batch });
        p.projects.set(project.key, record.id);
      }
    }
    const imported: { key: string; id: string }[] = [];
    for (const a of data.activities) {
      const activity = await createActivity(actor, activityInput(a, {
        project: p.projects.get(a.projectKey)!, area: p.areas.get(a.area)!,
        domain: p.domains.get(a.domain)!, owner: p.users.get(a.ownerEmail)!.id,
      }, data.batchId), { activities, projects, areas, domains, users, prisma: batch });
      imported.push({ key: a.key, id: activity.id });
      let version = activity.version;
      for (const description of a.tasks) {
        const updated = await addActivityTask(actor, { activityId: activity.id, version, description }, { activities, prisma: batch });
        version = updated.version;
      }
    }
    await tx.auditEvent.create({ data: {
      actorUserId: actor.id, entityKind: "Activity", entityId: imported[0].id,
      activityId: imported[0].id, action: MARKER_ACTION,
      changes: { batchId: data.batchId, hash: testDataHash(data), referenceDate: data.referenceDate, synthetic: true, activities: imported },
    } });
    return { ...summary, ...changes, outcome: "imported" as const };
  }, { timeout: 300_000, maxWait: 10_000 });
  // A failed notification does not turn a committed import into a reported failure.
  let notificationWarning = false;
  if (result.outcome === "imported" && options.notify) {
    try { await options.notify(realtimeIds); }
    catch { notificationWarning = true; }
  }
  return { ...result, notificationWarning };
}
