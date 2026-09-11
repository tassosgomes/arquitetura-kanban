import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/application/projects";
import { canEditProject } from "@/domain/project/project-status";
import { instantToCivilDate } from "@/domain/calendar/civil-date";
import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";
import { projectRepository, requireActiveUser } from "@/infrastructure/composition";
import { createValueDeliveryAction } from "@/app/actions/value-deliveries";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { ValueDeliveryForm } from "@/ui/value-deliveries/ValueDeliveryForm";

type NewValueDeliveryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewValueDeliveryPage({ params }: NewValueDeliveryPageProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const project = await getProject(actor, id, projectRepository);

  if (!project) {
    notFound();
  }

  if (!canEditProject(project.status)) {
    return (
      <ErrorState
        title="Projeto cancelado"
        message="Projetos cancelados não recebem novas entregas de valor. Os registros existentes permanecem visíveis."
        action={
          <Link
            href={`/projects/${project.id}/value-deliveries`}
            className="text-sm font-medium text-zinc-900 underline"
          >
            Voltar às entregas
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        <Link
          href={`/projects/${project.id}/value-deliveries`}
          className="font-medium text-zinc-700 underline hover:text-zinc-900"
        >
          Entregas de valor
        </Link>
      </p>
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Nova entrega de valor</h2>
      <ValueDeliveryForm
        mode="create"
        projectId={project.id}
        action={createValueDeliveryAction}
        cancelHref={`/projects/${project.id}/value-deliveries`}
        initial={{
          title: "",
          contentMarkdown: "",
          referenceDate: instantToCivilDate(new Date(), APP_TIME_ZONE),
        }}
      />
    </div>
  );
}
