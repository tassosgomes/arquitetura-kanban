"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import {
  addActivityTask,
  addActivityTaskSchema,
  changeActivityStatus,
  changeActivityStatusSchema,
  createActivity,
  createActivitySchema,
  removeActivityTask,
  removeActivityTaskSchema,
  reorderActivityTasks,
  reorderActivityTasksSchema,
  toggleActivityTask,
  toggleActivityTaskSchema,
  updateActivity,
  updateActivitySchema,
  updateActivityTask,
  updateActivityTaskSchema,
} from "@/application/activities";
import type { ActivityChecklistResult, ActivityRecord } from "@/application/activities";
import { runAction, type ActionResult } from "@/app/actions/action-result";
import {
  activityRepository,
  areaRepository,
  catalogUserRepository,
  domainRepository,
  prisma,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";

function activityDeps() {
  return {
    activities: activityRepository,
    projects: projectRepository,
    areas: areaRepository,
    domains: domainRepository,
    users: catalogUserRepository,
    prisma,
  };
}

function revalidateActivity(activity: { id: string; project: { id: string } | null }) {
  revalidatePath("/kanban");
  revalidatePath(`/activities/${activity.id}`);
  revalidatePath(`/activities/${activity.id}/edit`);
  if (activity.project) {
    revalidatePath(`/projects/${activity.project.id}`);
    revalidatePath(`/projects/${activity.project.id}/activities`);
  }
}

function zodFailure(error: ZodError): ActionResult<never> {
  const flattened = error.flatten();
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      fields[key] = messages;
    }
  }
  return {
    ok: false,
    error: {
      code: "VALIDATION",
      message: flattened.formErrors[0] ?? "Dados inválidos.",
      fields,
    },
  };
}

export async function createActivityAction(input: unknown): Promise<ActionResult<ActivityRecord>> {
  const parsed = createActivitySchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const activity = await createActivity(actor, parsed.data, activityDeps());
    revalidateActivity(activity);
    return activity;
  });
}

export async function updateActivityAction(input: unknown): Promise<ActionResult<ActivityRecord>> {
  const parsed = updateActivitySchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const activity = await updateActivity(actor, parsed.data, activityDeps());
    revalidateActivity(activity);
    return activity;
  });
}

export async function changeActivityStatusAction(
  input: unknown,
): Promise<ActionResult<ActivityRecord>> {
  const parsed = changeActivityStatusSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const activity = await changeActivityStatus(actor, parsed.data, activityDeps());
    revalidateActivity(activity);
    return activity;
  });
}

function checklistDeps() {
  return {
    activities: activityRepository,
    prisma,
  };
}

function revalidateChecklist(result: ActivityChecklistResult) {
  revalidateActivity({ id: result.id, project: result.projectId ? { id: result.projectId } : null });
}

export async function addActivityTaskAction(
  input: unknown,
): Promise<ActionResult<ActivityChecklistResult>> {
  const parsed = addActivityTaskSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const result = await addActivityTask(actor, parsed.data, checklistDeps());
    revalidateChecklist(result);
    return result;
  });
}

export async function updateActivityTaskAction(
  input: unknown,
): Promise<ActionResult<ActivityChecklistResult>> {
  const parsed = updateActivityTaskSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const result = await updateActivityTask(actor, parsed.data, checklistDeps());
    revalidateChecklist(result);
    return result;
  });
}

export async function toggleActivityTaskAction(
  input: unknown,
): Promise<ActionResult<ActivityChecklistResult>> {
  const parsed = toggleActivityTaskSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const result = await toggleActivityTask(actor, parsed.data, checklistDeps());
    revalidateChecklist(result);
    return result;
  });
}

export async function removeActivityTaskAction(
  input: unknown,
): Promise<ActionResult<ActivityChecklistResult>> {
  const parsed = removeActivityTaskSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const result = await removeActivityTask(actor, parsed.data, checklistDeps());
    revalidateChecklist(result);
    return result;
  });
}

export async function reorderActivityTasksAction(
  input: unknown,
): Promise<ActionResult<ActivityChecklistResult>> {
  const parsed = reorderActivityTasksSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const result = await reorderActivityTasks(actor, parsed.data, checklistDeps());
    revalidateChecklist(result);
    return result;
  });
}
