import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/application/projects";
import { getValueDelivery } from "@/application/value-deliveries";
import { canEditProject } from "@/domain/project/project-status";
import {
  projectRepository,
  requireActiveUser,
  valueDeliveryRepository,
} from "@/infrastructure/composition";
import { updateValueDeliveryAction } from "@/app/actions/value-deliveries";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { ValueDeliveryForm } from "@/ui/value-deliveries/ValueDeliveryForm";

type EditValueDeliveryPageProps = {
  params: Promise<{ id: string; deliveryId: string }>;
};

export default async function EditValueDeliveryPage({ params }: EditValueDeliveryPageProps) {
  const { id, deliveryId } = await params;
  const actor = await requireActiveUser();
  const project = await getProject(actor, id, projectRepository);

  if (!project) {
    notFound();
  }

  const delivery = await getValueDelivery(actor, project.id, deliveryId, valueDeliveryRepository);

  if (!delivery) {
    notFound();
  }

  if (!canEditProject(project.status)) {
    return (
      <ErrorState
        title="Projeto cancelado"
        message="Projetos cancelados não permitem editar entregas de valor. A visualização permanece disponível."
        action={
          <Link
            href={`/projects/${project.id}/value-deliveries/${delivery.id}`}
            className="text-label-md font-semibold text-primary underline"
          >
            Voltar à entrega
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-code-sm">
        <Link
          href={`/projects/${project.id}/value-deliveries/${delivery.id}`}
          className="font-semibold text-primary hover:underline"
        >
          {delivery.title}
        </Link>
      </p>
      <h2 className="text-headline-lg text-on-surface">Editar entrega de valor</h2>
      <ValueDeliveryForm
        mode="edit"
        projectId={project.id}
        action={updateValueDeliveryAction}
        cancelHref={`/projects/${project.id}/value-deliveries/${delivery.id}`}
        initial={{
          id: delivery.id,
          version: delivery.version,
          title: delivery.title,
          contentMarkdown: delivery.contentMarkdown,
          referenceDate: delivery.referenceDate,
        }}
      />
    </div>
  );
}
