import type { LocalUser } from "@/domain/identity/local-user";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ActivityProjectDefaults } from "@/application/activities/types";
import { toActivityProjectDefaults } from "@/application/activities/apply-inheritance";

export async function getProjectDefaults(
  _actor: LocalUser,
  projectId: string,
  projects: ProjectRepository,
): Promise<ActivityProjectDefaults | null> {
  const project = await projects.findById(projectId);
  if (!project) {
    return null;
  }
  return toActivityProjectDefaults(project);
}
