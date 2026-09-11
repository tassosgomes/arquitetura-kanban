import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/application/projects";
import { listValueDeliveries } from "@/application/value-deliveries";
import { canEditProject } from "@/domain/project/project-status";
import {
  projectRepository,
  requireActiveUser,
  valueDeliveryRepository,
} from "@/infrastructure/composition";
import { ValueDeliveryList } from "@/ui/value-deliveries/ValueDeliveryList";

type ProjectValueDeliveriesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectValueDeliveriesPage({
  params,
}: ProjectValueDeliveriesPageProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const project = await getProject(actor, id, projectRepository);

  if (!project) {
    notFound();
  }

  const deliveries = await listValueDeliveries(actor, project.id, valueDeliveryRepository);
  const canWrite = canEditProject(project.status);

  return (
    <div className="flex flex-col gap-4">
      {canWrite ? (
        <div className="flex justify-end">
          <Link
            href={`/projects/${project.id}/value-deliveries/new`}
            className="inline-flex rounded-xl bg-primary-container px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Nova entrega de valor
          </Link>
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant">
          Projeto cancelado: entregas de valor são somente leitura.
        </p>
      )}
      <ValueDeliveryList projectId={project.id} deliveries={deliveries} canWrite={canWrite} />
    </div>
  );
}
