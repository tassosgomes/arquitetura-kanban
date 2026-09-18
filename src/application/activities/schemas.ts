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

export const REQUIRED_ACTIVITY_FIELD_MESSAGES = {
  requestingAreaId: "Selecione a área solicitante.",
  nature: "Selecione a natureza.",
  architectureRole: "Selecione o papel da Arquitetura.",
  ownerId: "Selecione exatamente um responsável.",
} as const;

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

const uuidSchema = z.string().uuid("Identificador inválido.");

const optionalUuidSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  uuidSchema.optional(),
);

const requiredCatalogIdSchema = z
  .string({ error: "Selecione uma categoria." })
  .trim()
  .min(1, "Selecione uma categoria.")
  .pipe(catalogIdSchema);

const requiredRequestingAreaIdSchema = z
  .string({ error: REQUIRED_ACTIVITY_FIELD_MESSAGES.requestingAreaId })
  .trim()
  .min(1, REQUIRED_ACTIVITY_FIELD_MESSAGES.requestingAreaId)
  .pipe(catalogIdSchema);

const requiredOwnerIdSchema = z
  .string({ error: REQUIRED_ACTIVITY_FIELD_MESSAGES.ownerId })
  .trim()
  .min(1, REQUIRED_ACTIVITY_FIELD_MESSAGES.ownerId)
  .pipe(catalogIdSchema);

const optionalIdListSchema = z
  .array(catalogIdSchema)
  .optional()
  .transform((ids) => (ids === undefined ? undefined : [...new Set(ids)]));

const requiredIdListSchema = z
  .array(catalogIdSchema)
  .optional()
  .transform((ids) => [...new Set(ids ?? [])]);

const natureSchema = z.enum(
  [Nature.STRATEGIC, Nature.OPERATIONAL],
  REQUIRED_ACTIVITY_FIELD_MESSAGES.nature,
);
const optionalNatureSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  natureSchema.optional(),
);

const architectureRoleSchema = z.enum(
  [ArchitectureRole.RESPONSIBLE, ArchitectureRole.CONTRIBUTOR],
  REQUIRED_ACTIVITY_FIELD_MESSAGES.architectureRole,
);
const optionalArchitectureRoleSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  architectureRoleSchema.optional(),
);

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

const lifecycleStatusSchema = z.enum(
  [
    ActivityStatus.BACKLOG,
    ActivityStatus.TODO,
    ActivityStatus.IN_PROGRESS,
    ActivityStatus.WAITING,
    ActivityStatus.BLOCKED,
    ActivityStatus.DONE,
    ActivityStatus.CANCELLED,
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

const createActivityObject = z
  .object({
    title: titleSchema,
    description: optionalTextSchema,
    observations: optionalTextSchema,
    type: typeSchema,
    projectId: projectIdSchema,
    requestingAreaId: optionalUuidSchema,
    domainId: requiredCatalogIdSchema,
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
  })
  .superRefine((data, ctx) => {
    if (data.type !== ActivityType.AD_HOC) {
      return;
    }

    const requiredFields = [
      {
        path: ["requestingAreaId"],
        schema: requiredRequestingAreaIdSchema,
        value: data.requestingAreaId,
      },
      {
        path: ["ownerId"],
        schema: requiredOwnerIdSchema,
        value: data.ownerId,
      },
      { path: ["nature"], schema: natureSchema, value: data.nature },
      {
        path: ["architectureRole"],
        schema: architectureRoleSchema,
        value: data.architectureRole,
      },
    ] as const;

    for (const { path, schema, value } of requiredFields) {
      if (value !== undefined) {
        continue;
      }
      const parsed = schema.safeParse(value);
      if (!parsed.success && parsed.error.issues[0]) {
        ctx.addIssue({
          code: "custom",
          path: [...path],
          message: parsed.error.issues[0].message,
        });
      }
    }
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

export const changeActivityStatusSchema = z.object({
  id: catalogIdSchema,
  version: versionSchema,
  /** Omit on explicit “Reabrir” (DE-06 → Em andamento). */
  status: lifecycleStatusSchema.optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ChangeActivityStatusInput = z.infer<typeof changeActivityStatusSchema>;

const taskDescriptionSchema = z.string().trim().min(1, "Informe a descrição da tarefa.");

export const addActivityTaskSchema = z.object({
  activityId: catalogIdSchema,
  version: versionSchema,
  description: taskDescriptionSchema,
});

export const updateActivityTaskSchema = z.object({
  activityId: catalogIdSchema,
  taskId: catalogIdSchema,
  version: versionSchema,
  description: taskDescriptionSchema,
});

export const toggleActivityTaskSchema = z.object({
  activityId: catalogIdSchema,
  taskId: catalogIdSchema,
  version: versionSchema,
  isDone: z.boolean(),
});

export const removeActivityTaskSchema = z.object({
  activityId: catalogIdSchema,
  taskId: catalogIdSchema,
  version: versionSchema,
});

export const reorderActivityTasksSchema = z.object({
  activityId: catalogIdSchema,
  version: versionSchema,
  orderedTaskIds: z.array(catalogIdSchema),
});

export type AddActivityTaskInput = z.infer<typeof addActivityTaskSchema>;
export type UpdateActivityTaskInput = z.infer<typeof updateActivityTaskSchema>;
export type ToggleActivityTaskInput = z.infer<typeof toggleActivityTaskSchema>;
export type RemoveActivityTaskInput = z.infer<typeof removeActivityTaskSchema>;
export type ReorderActivityTasksInput = z.infer<typeof reorderActivityTasksSchema>;
