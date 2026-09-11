"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import {
  createActivity,
  createActivitySchema,
  updateActivity,
  updateActivitySchema,
} from "@/application/activities";
import type { ActivityRecord } from "@/application/activities";
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
