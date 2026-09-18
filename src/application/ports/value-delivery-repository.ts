import type { Prisma } from "@/generated/prisma/client";
import type {
  ValueDeliveryCreateData,
  ValueDeliveryListItem,
  ValueDeliveryRecord,
  ValueDeliveryWriteData,
} from "@/application/value-deliveries/types";

export type ValueDeliveryTx = Prisma.TransactionClient;

export interface ValueDeliveryRepository {
  findById(id: string, tx?: ValueDeliveryTx): Promise<ValueDeliveryRecord | null>;
  listByProjectId(projectId: string): Promise<ValueDeliveryListItem[]>;
  listByProjectIds(projectIds: readonly string[]): Promise<ValueDeliveryListItem[]>;
  create(
    data: ValueDeliveryCreateData,
    authorId: string,
    tx: ValueDeliveryTx,
  ): Promise<ValueDeliveryRecord>;
  update(
    id: string,
    data: ValueDeliveryWriteData,
    tx: ValueDeliveryTx,
  ): Promise<ValueDeliveryRecord>;
}
