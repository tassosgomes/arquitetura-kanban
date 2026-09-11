import { z } from "zod";
import { isCivilDateString } from "@/domain/calendar/civil-date";
import { catalogIdSchema } from "@/application/catalogs/schemas";

const titleSchema = z.string().trim().min(1, "Informe um título.");

const contentMarkdownSchema = z.string().trim().min(1, "Informe o conteúdo em Markdown.");

const referenceDateSchema = z
  .string()
  .trim()
  .min(1, "Informe a data de referência.")
  .refine((value) => isCivilDateString(value), {
    error: "Informe uma data válida.",
  });

const versionSchema = z.coerce.number().int().positive("Versão inválida.");

export const createValueDeliverySchema = z.object({
  projectId: catalogIdSchema,
  title: titleSchema,
  contentMarkdown: contentMarkdownSchema,
  referenceDate: referenceDateSchema,
});

export const updateValueDeliverySchema = z.object({
  id: catalogIdSchema,
  version: versionSchema,
  title: titleSchema,
  contentMarkdown: contentMarkdownSchema,
  referenceDate: referenceDateSchema,
});

export type CreateValueDeliveryInput = z.infer<typeof createValueDeliverySchema>;
export type UpdateValueDeliveryInput = z.infer<typeof updateValueDeliverySchema>;
