import type { ReactNode } from "react";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";
import {
  ARCHITECTURE_ROLE_LABELS,
  NATURE_LABELS,
} from "@/domain/catalog/classifications";
import { ARCHITECTURE_GROUP_LABEL } from "@/domain/catalog/architecture-group";
import type { ProjectRecord } from "@/application/projects";
import { formatCivilDatePtBr, formatUserLabel } from "@/ui/projects/project-types";
import { canEditProject } from "@/domain/project/project-status";
import { CancelProjectButton } from "@/ui/projects/CancelProjectButton";
import { cancelProjectAction } from "@/app/actions/projects";
import { ProjectStatusBadge } from "@/ui/projects/ProjectStatusBadge";

function formatInstant(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(value);
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-label-sm uppercase tracking-wider text-outline">{label}</dt>
      <dd className="text-body-md text-on-surface">{children}</dd>
    </div>
  );
}

export function ProjectOverview({ project }: { project: ProjectRecord }) {
  const editable = canEditProject(project.status);

  return (
    <div className="flex flex-col gap-8">
      <dl className="flex max-w-3xl flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
        <Item label="Status">
          <ProjectStatusBadge status={project.status} />
        </Item>
        <Item label="Descrição">{project.description ?? "—"}</Item>
        <Item label="Área responsável">
          {project.responsibleArea.name}
          {project.responsibleArea.isActive ? null : " (inativa)"}
        </Item>
        <Item label="Responsável">{ARCHITECTURE_GROUP_LABEL}</Item>
        <Item label="Responsável externo">{project.externalResponsible ?? "—"}</Item>
        <Item label="Participantes">
          {project.participants.length === 0
            ? "—"
            : project.participants
                .map(
                  (participant) =>
                    `${formatUserLabel(participant)}${participant.isActive ? "" : " (inativo)"}`,
                )
                .join(", ")}
        </Item>
        <Item label="Papel da Arquitetura">{ARCHITECTURE_ROLE_LABELS[project.architectureRole]}</Item>
        <Item label="Natureza">{NATURE_LABELS[project.nature]}</Item>
        <Item label="Data de início">
          {project.startDate ? formatCivilDatePtBr(project.startDate) : "—"}
        </Item>
        <Item label="Previsão de término">
          {project.expectedEndDate ? formatCivilDatePtBr(project.expectedEndDate) : "—"}
        </Item>
        <Item label="Criado por">
          {project.createdBy.displayName ?? "—"} em {formatInstant(project.createdAt)}
        </Item>
        <Item label="Atualizado por">
          {project.updatedBy.displayName ?? "—"} em {formatInstant(project.updatedAt)}
        </Item>
      </dl>

      {editable ? (
        <CancelProjectButton
          projectId={project.id}
          version={project.version}
          action={cancelProjectAction}
        />
      ) : (
        <p className="text-body-sm text-on-surface-variant">
          Projeto cancelado: o registro foi preservado e não pode ser editado.
        </p>
      )}
    </div>
  );
}
