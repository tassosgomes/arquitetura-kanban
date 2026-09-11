import { z } from "zod";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import {
  ArchitectureRole,
  Effort,
  Nature,
  Priority,
} from "@/domain/catalog/classifications";
import { isCivilDateString } from "@/domain/calendar/civil-date";
import { isActivityProjectLinkValid } from "@/domain/activity/activity-project-link";
import { catalogIdSchema } from "@/application/catalogs/schemas";

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

const optionalUuidSchema = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? undefined : trimmed;
  })
  .refine((value) => value === undefined || z.string().uuid().safeParse(value).success, {
    error: "Identificador inválido.",
  });

const optionalIdListSchema = z
  .array(catalogIdSchema)
  .optional()
  .transform((ids) => (ids === undefined ? undefined : [...new Set(ids)]));

const requiredIdListSchema = z
  .array(catalogIdSchema)
  .optional()
  .transform((ids) => [...new Set(ids ?? [])]);

const natureSchema = z.enum([Nature.STRATEGIC, Nature.OPERATIONAL], "Selecione a natureza.");
const optionalNatureSchema = z
  .enum([Nature.STRATEGIC, Nature.OPERATIONAL])
  .optional()
  .or(z.literal(""))
  .transform((value) => (value === "" || value === undefined ? undefined : value));

const architectureRoleSchema = z.enum(
  [ArchitectureRole.RESPONSIBLE, ArchitectureRole.CONTRIBUTOR],
  "Selecione o papel da Arquitetura.",
);
const optionalArchitectureRoleSchema = z
  .enum([ArchitectureRole.RESPONSIBLE, ArchitectureRole.CONTRIBUTOR])
  .optional()
  .or(z.literal(""))
  .transform((value) => (value === "" || value === undefined ? undefined : value));

const boardStatusSchema = z.enum(
  [
    ActivityStatus.BACKLOG,
    ActivityStatus.TODO,
    ActivityStatus.IN_PROGRESS,
    ActivityStatus.WAITING,
    ActivityStatus.BLOCKED,
    ActivityStatus.DONE,
  ],
  "Selecione o status.",
);

const typeSchema = z.enum([ActivityType.PROJECT, ActivityType.AD_HOC], "Selecione o tipo.");

const prioritySchema = z.enum(
  [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL],
  "Selecione a prioridade.",
);

const effortSchema = z
  .enum([Effort.P, Effort.M, Effort.G])
  .optional()
  .or(z.literal(""))
  .transform((value) => (value === "" || value === undefined ? null : value));

const versionSchema = z.coerce.number().int().positive("Versão inválida.");

const titleSchema = z.string().trim().min(1, "Informe um título.");

const projectIdSchema = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine((value) => value === null || z.string().uuid().safeParse(value).success, {
    error: "Projeto inválido.",
  });

type DateOrdered = {
  startDate: string | null;
  expectedEndDate: string | null;
  completedDate?: string | null;
};

function withDateOrder<T extends z.ZodType<DateOrdered>>(schema: T) {
  return schema
    .refine(
      (data) =>
        !data.startDate || !data.expectedEndDate || data.startDate <= data.expectedEndDate,
      {
        error: "A previsão de término deve ser igual ou posterior à data de início.",
        path: ["expectedEndDate"],
      },
    )
    .refine(
      (data) =>
        !data.startDate ||
        !data.completedDate ||
        data.startDate <= data.completedDate,
      {
        error: "A data de conclusão deve ser igual ou posterior à data de início.",
        path: ["completedDate"],
      },
    );
}

function withProjectLink<
  T extends z.ZodType<{ type: ActivityType; projectId: string | null }>,
>(schema: T) {
  return schema.refine((data) => isActivityProjectLinkValid(data.type, data.projectId), {
    error: "Tipo Projeto exige um projeto; Ad hoc não pode ter projeto.",
    path: ["projectId"],
  });
}

const createActivityObject = z.object({
  title: titleSchema,
  description: optionalTextSchema,
  observations: optionalTextSchema,
  type: typeSchema,
  projectId: projectIdSchema,
  requestingAreaId: optionalUuidSchema,
  domainId: catalogIdSchema,
  nature: optionalNatureSchema,
  architectureRole: optionalArchitectureRoleSchema,
  ownerId: optionalUuidSchema,
  participantIds: optionalIdListSchema,
  involvedAreaIds: requiredIdListSchema,
  priority: prioritySchema,
  effort: effortSchema,
  status: boardStatusSchema,
  startDate: civilDateSchema,
  expectedEndDate: civilDateSchema,
  completedDate: civilDateSchema,
});

export const createActivitySchema = withProjectLink(withDateOrder(createActivityObject));

export const updateActivitySchema = withProjectLink(
  withDateOrder(
    z.object({
      id: catalogIdSchema,
      version: versionSchema,
      title: titleSchema,
      description: optionalTextSchema,
      observations: optionalTextSchema,
      type: typeSchema,
      projectId: projectIdSchema,
      requestingAreaId: catalogIdSchema,
      domainId: catalogIdSchema,
      nature: natureSchema,
      architectureRole: architectureRoleSchema,
      ownerId: catalogIdSchema,
      participantIds: requiredIdListSchema,
      involvedAreaIds: requiredIdListSchema,
      priority: prioritySchema,
      effort: effortSchema,
      status: boardStatusSchema,
      startDate: civilDateSchema,
      expectedEndDate: civilDateSchema,
      completedDate: civilDateSchema,
    }),
  ),
);

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
