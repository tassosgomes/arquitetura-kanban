import type { LocalUser } from "@/domain/identity/local-user";
import type { ValueDeliveryRepository } from "@/application/ports/value-delivery-repository";
import type { ValueDeliveryRecord } from "@/application/value-deliveries/types";

export async function getValueDelivery(
  _actor: LocalUser,
  projectId: string,
  id: string,
  valueDeliveries: ValueDeliveryRepository,
): Promise<ValueDeliveryRecord | null> {
  const delivery = await valueDeliveries.findById(id);
  if (!delivery || delivery.projectId !== projectId) {
    return null;
  }
  return delivery;
}
