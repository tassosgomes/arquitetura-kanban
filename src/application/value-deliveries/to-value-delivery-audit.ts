import {
  VALUE_DELIVERY_AUDIT_FIELDS,
  type ValueDeliveryAuditField,
} from "@/application/audit";
import type { AuditJsonValue } from "@/application/audit";
import type { ValueDeliveryRecord } from "@/application/value-deliveries/types";

export function toValueDeliveryAudit(
  delivery: ValueDeliveryRecord,
): Record<ValueDeliveryAuditField, AuditJsonValue> {
  return {
    title: delivery.title,
    referenceDate: delivery.referenceDate,
    contentMarkdown: delivery.contentMarkdown,
    projectId: delivery.projectId,
    authorId: delivery.author.id,
  };
}

export { VALUE_DELIVERY_AUDIT_FIELDS };
