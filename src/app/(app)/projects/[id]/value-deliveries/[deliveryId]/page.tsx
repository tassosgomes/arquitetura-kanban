import { notFound } from "next/navigation";
import { getProject } from "@/application/projects";
import { getValueDelivery } from "@/application/value-deliveries";
import { canEditProject } from "@/domain/project/project-status";
import {
  projectRepository,
  requireActiveUser,
  valueDeliveryRepository,
} from "@/infrastructure/composition";
import { ValueDeliveryDetail } from "@/ui/value-deliveries/ValueDeliveryDetail";

type ValueDeliveryPageProps = {
  params: Promise<{ id: string; deliveryId: string }>;
};

export default async function ValueDeliveryPage({ params }: ValueDeliveryPageProps) {
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

  return (
    <ValueDeliveryDetail delivery={delivery} canWrite={canEditProject(project.status)} />
  );
}
