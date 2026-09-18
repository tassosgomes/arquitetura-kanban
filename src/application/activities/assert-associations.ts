import { ValidationError } from "@/domain/errors";
import { ActivityType } from "@/domain/activity/enums";
import { isActiveProjectStatus } from "@/domain/project/project-status";
import type { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import type { CatalogTx, CatalogUserRepository, AreaRepository, DomainRepository } from "@/application/ports/catalog-repositories";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ProjectRecord } from "@/application/projects/types";

export async function assertUsableRequestingArea(
  areaId: string,
  areas: AreaRepository,
  tx: CatalogTx,
  currentAreaId?: string,
): Promise<void> {
  const area = await areas.findById(areaId, tx);
  if (!area) {
    throw new ValidationError("Área solicitante inválida.", {
      requestingAreaId: ["Selecione uma área válida."],
    });
  }
  if (area.isActive) {
    return;
  }
  throw new ValidationError("A área solicitante precisa estar ativa.", {
    requestingAreaId: [
      currentAreaId === areaId
        ? "A área solicitante ficou inativa. Selecione uma área ativa para salvar."
        : "Selecione uma área ativa.",
    ],
  });
}

export async function assertUsableDomain(
  domainId: string,
  domains: DomainRepository,
  tx: CatalogTx,
  currentDomainId?: string,
): Promise<void> {
  const domain = await domains.findById(domainId, tx);
  if (!domain) {
    throw new ValidationError("Categoria inválida.", {
      domainId: ["Selecione uma categoria válida."],
    });
  }
  if (domain.isActive) {
    return;
  }
  throw new ValidationError("A categoria precisa estar ativa.", {
    domainId: [
      currentDomainId === domainId
        ? "A categoria ficou inativa. Selecione uma categoria ativa para salvar."
        : "Selecione uma categoria ativa.",
    ],
  });
}

export async function assertActiveOwner(
  ownerId: string,
  users: CatalogUserRepository,
  tx: CatalogTx,
): Promise<void> {
  const user = await users.findById(ownerId, tx);
  if (!user) {
    throw new ValidationError("Responsável inválido.", {
      ownerId: ["Selecione um responsável válido."],
    });
  }
  if (user.isActive) {
    return;
  }
  throw new ValidationError("O responsável precisa estar ativo.", {
    ownerId: ["O responsável atual está inativo. Reatribua para um usuário ativo para salvar."],
  });
}

export async function assertParticipants(
  participantIds: readonly string[],
  users: CatalogUserRepository,
  tx: CatalogTx,
  previouslyAssociatedIds: ReadonlySet<string>,
): Promise<void> {
  if (participantIds.length === 0) {
    return;
  }

  const found = await users.findByIds(participantIds, tx);
  const byId = new Map(found.map((user) => [user.id, user]));
  const missing = participantIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new ValidationError("Participante inválido.", {
      participantIds: ["Selecione apenas usuários existentes."],
    });
  }

  const illegalInactive = participantIds.filter((id) => {
    const user = byId.get(id);
    return Boolean(user && !user.isActive && !previouslyAssociatedIds.has(id));
  });
  if (illegalInactive.length > 0) {
    throw new ValidationError("Participantes inativos não podem ser associados.", {
      participantIds: ["Usuários inativos não entram em novas associações."],
    });
  }
}

export async function assertInvolvedAreas(
  areaIds: readonly string[],
  areas: AreaRepository,
  tx: CatalogTx,
  previouslyAssociatedIds: ReadonlySet<string>,
): Promise<void> {
  if (areaIds.length === 0) {
    return;
  }

  const found = await Promise.all(areaIds.map((id) => areas.findById(id, tx)));
  const byId = new Map(
    found.filter((area): area is NonNullable<typeof area> => area !== null).map((area) => [area.id, area]),
  );
  const missing = areaIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new ValidationError("Área envolvida inválida.", {
      involvedAreaIds: ["Selecione apenas áreas existentes."],
    });
  }

  const illegalInactive = areaIds.filter((id) => {
    const area = byId.get(id);
    return Boolean(area && !area.isActive && !previouslyAssociatedIds.has(id));
  });
  if (illegalInactive.length > 0) {
    throw new ValidationError("Áreas inativas não podem ser associadas.", {
      involvedAreaIds: ["Áreas inativas não entram em novas associações."],
    });
  }
}

export async function assertProjectLink(
  type: ActivityType,
  projectId: string | null,
  projects: ProjectRepository,
  tx: CatalogTx,
  currentProjectId?: string | null,
): Promise<ProjectRecord | null> {
  if (type === ActivityType.AD_HOC) {
    return null;
  }

  if (!projectId) {
    throw new ValidationError("Tipo Projeto exige um projeto.", {
      projectId: ["Selecione um projeto."],
    });
  }

  const project = await projects.findById(projectId, tx);
  if (!project) {
    throw new ValidationError("Projeto inválido.", {
      projectId: ["Selecione um projeto válido."],
    });
  }

  const keepingCurrent = currentProjectId === project.id;
  if (!keepingCurrent && !isActiveProjectStatus(project.status)) {
    throw new ValidationError("Vincule a um projeto não cancelado.", {
      projectId: ["Selecione um projeto que não esteja cancelado."],
    });
  }

  return project;
}

export function requireInheritedFields<T extends {
  ownerId?: string;
  requestingAreaId?: string;
  nature?: Nature;
  architectureRole?: ArchitectureRole;
}>(
  input: T,
): T & {
  ownerId: string;
  requestingAreaId: string;
  nature: Nature;
  architectureRole: ArchitectureRole;
} {
  const fields: Record<string, string[]> = {};
  if (!input.ownerId) {
    fields.ownerId = ["Selecione exatamente um responsável."];
  }
  if (!input.requestingAreaId) {
    fields.requestingAreaId = ["Selecione a área solicitante."];
  }
  if (!input.nature) {
    fields.nature = ["Selecione a natureza."];
  }
  if (!input.architectureRole) {
    fields.architectureRole = ["Selecione o papel da Arquitetura."];
  }
  if (Object.keys(fields).length > 0) {
    throw new ValidationError("Preencha os campos obrigatórios.", fields);
  }
  return input as T & {
    ownerId: string;
    requestingAreaId: string;
    nature: Nature;
    architectureRole: ArchitectureRole;
  };
}

export function assertCompletedDateNotFuture(
  completedDate: string | null,
  today: string,
): void {
  if (completedDate && completedDate > today) {
    throw new ValidationError("A data de conclusão não pode ser futura.", {
      completedDate: ["Informe uma data igual ou anterior a hoje."],
    });
  }
}
