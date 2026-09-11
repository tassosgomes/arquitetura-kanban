import Link from "next/link";
import { listActiveAreas, listActiveUsers } from "@/application/catalogs";
import { ArchitectureRole, Nature } from "@/domain/catalog/classifications";
import { ProjectStatus } from "@/domain/project/project-status";
import {
  areaRepository,
  catalogUserRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { createProjectAction } from "@/app/actions/projects";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { ProjectForm } from "@/ui/projects/ProjectForm";

export default async function NewProjectPage() {
  const actor = await requireActiveUser();
  const [areas, users] = await Promise.all([
    listActiveAreas(actor, areaRepository),
    listActiveUsers(actor, catalogUserRepository),
  ]);

  if (areas.length === 0) {
    return (
      <EmptyState
        title="Cadastre uma área primeiro"
        message="É necessário ao menos uma área ativa para criar um projeto."
        action={
          <Link href="/catalogs/areas" className="text-label-md font-semibold text-primary underline">
            Ir para áreas
          </Link>
        }
      />
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="Nenhum usuário ativo"
        message="É necessário um usuário ativo para definir o responsável de Arquitetura."
      />
    );
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-code-sm">
          <Link href="/projects" className="font-semibold text-primary hover:underline">
            Projetos
          </Link>
        </p>
        <h1 className="text-headline-lg text-on-surface">Novo projeto</h1>
      </header>
      <ProjectForm
        mode="create"
        action={createProjectAction}
        areas={areas.map((area) => ({ id: area.id, name: area.name, isActive: area.isActive }))}
        users={users}
        cancelHref="/projects"
        initial={{
          name: "",
          description: "",
          responsibleAreaId: "",
          externalResponsible: "",
          architectureOwnerId: "",
          participantIds: [],
          architectureRole: ArchitectureRole.RESPONSIBLE,
          nature: Nature.STRATEGIC,
          startDate: "",
          expectedEndDate: "",
          status: ProjectStatus.PLANNED,
        }}
      />
    </div>
  );
}
