import type { ReactNode } from "react";
import Link from "next/link";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";
import {
  ACTIVITY_NATURE_LABELS,
  ARCHITECTURE_ROLE_LABELS,
  EFFORT_LABELS,
  PRIORITY_LABELS,
} from "@/domain/catalog/classifications";
import { ACTIVITY_TYPE_LABELS, canEditActivity } from "@/domain/activity/enums";
import type { ActivityRecord } from "@/application/activities";
import { formatCivilDatePtBr, formatUserLabel } from "@/ui/projects/project-types";
import { ActivityStatusBadge } from "@/ui/activities/ActivityStatusBadge";

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
      <dt className="text-sm font-medium text-zinc-600">{label}</dt>
      <dd className="text-sm text-zinc-900">{children}</dd>
    </div>
  );
}

export function ActivityDetail({ activity }: { activity: ActivityRecord }) {
  const editable = canEditActivity(activity.status);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <Link href="/kanban" className="font-medium text-zinc-700 underline hover:text-zinc-900">
              Kanban
            </Link>
            {activity.project ? (
              <>
                {" · "}
                <Link
                  href={`/projects/${activity.project.id}/activities`}
                  className="font-medium text-zinc-700 underline hover:text-zinc-900"
                >
                  {activity.project.name}
                </Link>
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{activity.title}</h1>
            <ActivityStatusBadge status={activity.status} />
          </div>
        </div>
        {editable ? (
          <Link
            href={`/activities/${activity.id}/edit`}
            className="inline-flex shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Editar
          </Link>
        ) : null}
      </div>

      <dl className="flex max-w-3xl flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5">
        <Item label="Tipo">{ACTIVITY_TYPE_LABELS[activity.type]}</Item>
        <Item label="Projeto">
          {activity.project ? (
            <Link
              href={`/projects/${activity.project.id}`}
              className="font-medium text-zinc-900 underline hover:text-zinc-700"
            >
              {activity.project.name}
            </Link>
          ) : (
            "—"
          )}
        </Item>
        <Item label="Descrição">{activity.description ?? "—"}</Item>
        <Item label="Área solicitante">
          {activity.requestingArea.name}
          {activity.requestingArea.isActive ? null : " (inativa)"}
        </Item>
        <Item label="Áreas envolvidas">
          {activity.involvedAreas.length === 0
            ? "—"
            : activity.involvedAreas
                .map((area) => `${area.name}${area.isActive ? "" : " (inativa)"}`)
                .join(", ")}
        </Item>
        <Item label="Domínio">
          {activity.domain.name}
          {activity.domain.isActive ? null : " (inativo)"}
        </Item>
        <Item label="Natureza">{ACTIVITY_NATURE_LABELS[activity.nature]}</Item>
        <Item label="Papel da Arquitetura">
          {ARCHITECTURE_ROLE_LABELS[activity.architectureRole]}
        </Item>
        <Item label="Responsável">
          {formatUserLabel(activity.owner)}
          {activity.owner.isActive ? null : " (inativo)"}
        </Item>
        <Item label="Participantes">
          {activity.participants.length === 0
            ? "—"
            : activity.participants
                .map(
                  (participant) =>
                    `${formatUserLabel(participant)}${participant.isActive ? "" : " (inativo)"}`,
                )
                .join(", ")}
        </Item>
        <Item label="Prioridade">{PRIORITY_LABELS[activity.priority]}</Item>
        <Item label="Esforço">{activity.effort ? EFFORT_LABELS[activity.effort] : "Não informado"}</Item>
        <Item label="Data de início">
          {activity.startDate ? formatCivilDatePtBr(activity.startDate) : "—"}
        </Item>
        <Item label="Previsão de término">
          {activity.expectedEndDate ? formatCivilDatePtBr(activity.expectedEndDate) : "—"}
        </Item>
        <Item label="Data de conclusão">
          {activity.completedDate ? formatCivilDatePtBr(activity.completedDate) : "—"}
        </Item>
        <Item label="Data de cancelamento">
          {activity.cancelledDate ? formatCivilDatePtBr(activity.cancelledDate) : "—"}
        </Item>
        <Item label="Observações">{activity.observations ?? "—"}</Item>
        <Item label="Criado por">
          {activity.createdBy.displayName ?? "—"} em {formatInstant(activity.createdAt)}
        </Item>
        <Item label="Atualizado por">
          {activity.updatedBy.displayName ?? "—"} em {formatInstant(activity.updatedAt)}
        </Item>
      </dl>

      {editable ? null : (
        <p className="text-sm text-zinc-600">
          Atividade cancelada: o registro foi preservado e não pode ser editado. O cancelamento
          completo entra na próxima entrega.
        </p>
      )}
    </div>
  );
}
