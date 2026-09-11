import type { LocalUser } from "@/domain/identity/local-user";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ProjectInheritanceSnapshot } from "@/application/projects";

export async function listProjectPrefills(
  _actor: LocalUser,
  projects: ProjectRepository,
): Promise<ProjectInheritanceSnapshot[]> {
  return projects.listActiveInheritanceSnapshots();
}
