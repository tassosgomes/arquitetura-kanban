import type { LocalUser } from "@/domain/identity/local-user";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ProjectRecord } from "@/application/projects/types";

export async function getProject(
  _actor: LocalUser,
  id: string,
  projects: ProjectRepository,
): Promise<ProjectRecord | null> {
  return projects.findById(id);
}
