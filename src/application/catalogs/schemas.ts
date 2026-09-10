import { z } from "zod";

export const catalogNameSchema = z
  .string()
  .trim()
  .min(1, "Informe um nome.");

export const catalogIdSchema = z.string().uuid("Identificador inválido.");

export const createCatalogSchema = z.object({
  name: catalogNameSchema,
});

export const renameCatalogSchema = z.object({
  id: catalogIdSchema,
  name: catalogNameSchema,
});

export const deactivateCatalogSchema = z.object({
  id: catalogIdSchema,
});
