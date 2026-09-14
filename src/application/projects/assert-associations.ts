import { ValidationError } from "@/domain/errors";
import type { CatalogTx, CatalogUserRepository, AreaRepository } from "@/application/ports/catalog-repositories";

export function assertUniqueActiveProjectName(
  existing: { id: string } | null,
  excludeId?: string,
): void {
  if (!existing) {
    return;
  }
  if (excludeId && existing.id === excludeId) {
    return;
  }
  throw new ValidationError("Nome já em uso por um projeto ativo.", {
    name: ["Já existe um projeto ativo com este nome."],
  });
}

export async function assertUsableArea(
  areaId: string,
  areas: AreaRepository,
  tx: CatalogTx,
  currentAreaId?: string,
): Promise<void> {
  const area = await areas.findById(areaId, tx);
  if (!area) {
    throw new ValidationError("Área responsável inválida.", {
      responsibleAreaId: ["Selecione uma área válida."],
    });
  }
  if (area.isActive) {
    return;
  }
  throw new ValidationError("A área responsável precisa estar ativa.", {
    responsibleAreaId: [
      currentAreaId === areaId
        ? "A área responsável ficou inativa. Selecione uma área ativa para salvar."
        : "Selecione uma área ativa.",
    ],
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
