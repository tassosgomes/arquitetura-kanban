"use server";

import { revalidatePath } from "next/cache";
import {
  createArea,
  createDomain,
  createCatalogSchema,
  deactivateArea,
  deactivateCatalogSchema,
  deactivateDomain,
  renameArea,
  renameCatalogSchema,
  renameDomain,
} from "@/application/catalogs";
import type { CatalogItem } from "@/application/catalogs";
import { runAction, type ActionResult } from "@/app/actions/action-result";
import {
  areaRepository,
  domainRepository,
  requireActiveUser,
} from "@/infrastructure/composition";

function revalidateCatalogs() {
  revalidatePath("/catalogs");
  revalidatePath("/catalogs/areas");
  revalidatePath("/catalogs/domains");
}

export async function createAreaAction(input: { name: string }): Promise<ActionResult<CatalogItem>> {
  const parsed = createCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Dados inválidos.",
        fields: { name: parsed.error.flatten().fieldErrors.name ?? ["Informe um nome."] },
      },
    };
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const item = await createArea(actor, parsed.data, areaRepository);
    revalidateCatalogs();
    return item;
  });
}

export async function renameAreaAction(input: {
  id: string;
  name: string;
}): Promise<ActionResult<CatalogItem>> {
  const parsed = renameCatalogSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Dados inválidos.",
        fields: {
          ...(fieldErrors.name ? { name: fieldErrors.name } : {}),
          ...(fieldErrors.id ? { id: fieldErrors.id } : {}),
        },
      },
    };
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const item = await renameArea(actor, parsed.data, areaRepository);
    revalidateCatalogs();
    return item;
  });
}

export async function deactivateAreaAction(input: { id: string }): Promise<ActionResult<CatalogItem>> {
  const parsed = deactivateCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Identificador inválido.",
        fields: { id: parsed.error.flatten().fieldErrors.id ?? ["Identificador inválido."] },
      },
    };
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const item = await deactivateArea(actor, parsed.data, areaRepository);
    revalidateCatalogs();
    return item;
  });
}

export async function createDomainAction(input: { name: string }): Promise<ActionResult<CatalogItem>> {
  const parsed = createCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Dados inválidos.",
        fields: { name: parsed.error.flatten().fieldErrors.name ?? ["Informe um nome."] },
      },
    };
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const item = await createDomain(actor, parsed.data, domainRepository);
    revalidateCatalogs();
    return item;
  });
}

export async function renameDomainAction(input: {
  id: string;
  name: string;
}): Promise<ActionResult<CatalogItem>> {
  const parsed = renameCatalogSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Dados inválidos.",
        fields: {
          ...(fieldErrors.name ? { name: fieldErrors.name } : {}),
          ...(fieldErrors.id ? { id: fieldErrors.id } : {}),
        },
      },
    };
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const item = await renameDomain(actor, parsed.data, domainRepository);
    revalidateCatalogs();
    return item;
  });
}

export async function deactivateDomainAction(input: {
  id: string;
}): Promise<ActionResult<CatalogItem>> {
  const parsed = deactivateCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Identificador inválido.",
        fields: { id: parsed.error.flatten().fieldErrors.id ?? ["Identificador inválido."] },
      },
    };
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const item = await deactivateDomain(actor, parsed.data, domainRepository);
    revalidateCatalogs();
    return item;
  });
}
