import type { LocalUser } from "@/domain/identity/local-user";
import type { ValueDeliveryRepository } from "@/application/ports/value-delivery-repository";
import type { ValueDeliveryListItem } from "@/application/value-deliveries/types";

export async function listValueDeliveries(
  _actor: LocalUser,
  projectId: string,
  valueDeliveries: ValueDeliveryRepository,
): Promise<ValueDeliveryListItem[]> {
  return valueDeliveries.listByProjectId(projectId);
}
