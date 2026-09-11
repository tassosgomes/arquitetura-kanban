import { z } from "zod";
import { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import { ProjectStatus } from "@/domain/project/project-status";
import { isCivilDateString } from "@/domain/calendar/civil-date";
import { catalogIdSchema, catalogNameSchema } from "@/application/catalogs/schemas";

const optionalTextSchema = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? null : trimmed;
  });

const civilDateSchema = z
  .string()
  .optional()
  .transform((value) => (value ?? "").trim())
  .refine((value) => value === "" || isCivilDateString(value), {
    error: "Informe uma data válida.",
  })
  .transform((value) => (value === "" ? null : value));

const participantIdsSchema = z
  .array(catalogIdSchema)
  .optional()
  .transform((ids) => [...new Set(ids ?? [])]);

const natureSchema = z.enum([Nature.STRATEGIC, Nature.OPERATIONAL], "Selecione a natureza.");

const architectureRoleSchema = z.enum(
  [ArchitectureRole.RESPONSIBLE, ArchitectureRole.CONTRIBUTOR],
  "Selecione o papel da Arquitetura.",
);

const createStatusSchema = z.enum(
  [
    ProjectStatus.PLANNED,
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ],
  "Selecione o status.",
);

const editStatusSchema = z.enum(
  [ProjectStatus.PLANNED, ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED],
  "Selecione o status.",
);

const versionSchema = z.coerce.number().int().positive("Versão inválida.");

function withDateOrder<T extends z.ZodType<{ startDate: string | null; expectedEndDate: string | null }>>(
  schema: T,
) {
  return schema.refine(
    (data) =>
      !data.startDate || !data.expectedEndDate || data.startDate <= data.expectedEndDate,
    {
      error: "A previsão de término deve ser igual ou posterior à data de início.",
      path: ["expectedEndDate"],
    },
  );
}

export const createProjectSchema = withDateOrder(
  z.object({
    name: catalogNameSchema,
    description: optionalTextSchema,
    responsibleAreaId: catalogIdSchema,
    externalResponsible: optionalTextSchema,
    architectureOwnerId: catalogIdSchema,
    participantIds: participantIdsSchema,
    architectureRole: architectureRoleSchema,
    nature: natureSchema,
    startDate: civilDateSchema,
    expectedEndDate: civilDateSchema,
    status: createStatusSchema,
  }),
);

export const updateProjectSchema = withDateOrder(
  z.object({
    id: catalogIdSchema,
    version: versionSchema,
    name: catalogNameSchema,
    description: optionalTextSchema,
    responsibleAreaId: catalogIdSchema,
    externalResponsible: optionalTextSchema,
    architectureOwnerId: catalogIdSchema,
    participantIds: participantIdsSchema,
    architectureRole: architectureRoleSchema,
    nature: natureSchema,
    startDate: civilDateSchema,
    expectedEndDate: civilDateSchema,
    status: editStatusSchema,
  }),
);

export const cancelProjectSchema = z.object({
  id: catalogIdSchema,
  version: versionSchema,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CancelProjectInput = z.infer<typeof cancelProjectSchema>;
