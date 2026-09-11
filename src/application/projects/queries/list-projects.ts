import type { LocalUser } from "@/domain/identity/local-user";
import type { ProjectRepository } from "@/application/ports/project-repository";
import type { ProjectListFilter, ProjectListItem } from "@/application/projects/types";

export async function listProjects(
  _actor: LocalUser,
  filter: ProjectListFilter,
  projects: ProjectRepository,
): Promise<ProjectListItem[]> {
  return projects.list(filter);
}
