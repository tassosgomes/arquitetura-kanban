import type { PrismaClient } from "@/generated/prisma/client";
import { ARCHITECTURE_DOMAIN_NAMES } from "@/domain/catalog/architecture-domains";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";

/**
 * Garante os seis domínios do PRD. Idempotente.
 * Não altera `isActive` (inativação em T09 permanece).
 * Não cria áreas, projetos nem usuários fictícios.
 */
export async function seedArchitectureDomains(prisma: PrismaClient): Promise<void> {
  for (const name of ARCHITECTURE_DOMAIN_NAMES) {
    const nameNormalized = normalizeCatalogName(name);
    const existing = await prisma.architectureDomain.findFirst({
      where: { nameNormalized },
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      if (existing.name !== name) {
        await prisma.architectureDomain.update({
          where: { id: existing.id },
          data: { name, nameNormalized },
        });
      }
      continue;
    }

    await prisma.architectureDomain.create({
      data: {
        name,
        nameNormalized,
        isActive: true,
      },
    });
  }
}
