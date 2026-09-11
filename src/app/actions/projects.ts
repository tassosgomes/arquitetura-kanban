"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import {
  cancelProject,
  cancelProjectSchema,
  createProject,
  createProjectSchema,
  updateProject,
  updateProjectSchema,
} from "@/application/projects";
import type { ProjectRecord } from "@/application/projects";
import { runAction, type ActionResult } from "@/app/actions/action-result";
import {
  areaRepository,
  catalogUserRepository,
  prisma,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";

function projectDeps() {
  return {
    projects: projectRepository,
    areas: areaRepository,
    users: catalogUserRepository,
    prisma,
  };
}

function revalidateProject(id?: string) {
  revalidatePath("/projects");
  if (id) {
    revalidatePath(`/projects/${id}`);
    revalidatePath(`/projects/${id}/edit`);
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

export async function createProjectAction(input: unknown): Promise<ActionResult<ProjectRecord>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const project = await createProject(actor, parsed.data, projectDeps());
    revalidateProject(project.id);
    return project;
  });
}

export async function updateProjectAction(input: unknown): Promise<ActionResult<ProjectRecord>> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const project = await updateProject(actor, parsed.data, projectDeps());
    revalidateProject(project.id);
    return project;
  });
}

export async function cancelProjectAction(input: unknown): Promise<ActionResult<ProjectRecord>> {
  const parsed = cancelProjectSchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const project = await cancelProject(actor, parsed.data, projectDeps());
    revalidateProject(project.id);
    return project;
  });
}
