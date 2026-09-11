"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import {
  createValueDelivery,
  createValueDeliverySchema,
  updateValueDelivery,
  updateValueDeliverySchema,
} from "@/application/value-deliveries";
import type { ValueDeliveryRecord } from "@/application/value-deliveries";
import { runAction, type ActionResult } from "@/app/actions/action-result";
import {
  prisma,
  projectRepository,
  requireActiveUser,
  valueDeliveryRepository,
} from "@/infrastructure/composition";

function valueDeliveryDeps() {
  return {
    valueDeliveries: valueDeliveryRepository,
    projects: projectRepository,
    prisma,
  };
}

function revalidateValueDelivery(delivery: { id: string; projectId: string }) {
  revalidatePath(`/projects/${delivery.projectId}`);
  revalidatePath(`/projects/${delivery.projectId}/value-deliveries`);
  revalidatePath(`/projects/${delivery.projectId}/value-deliveries/${delivery.id}`);
  revalidatePath(`/projects/${delivery.projectId}/value-deliveries/${delivery.id}/edit`);
  revalidatePath(`/projects/${delivery.projectId}/history`);
}

function zodFailure(error: ZodError): ActionResult<never> {
  const flattened = error.flatten();
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      fields[key] = messages;
    }
  }
  return {
    ok: false,
    error: {
      code: "VALIDATION",
      message: flattened.formErrors[0] ?? "Dados inválidos.",
      fields,
    },
  };
}

export async function createValueDeliveryAction(
  input: unknown,
): Promise<ActionResult<ValueDeliveryRecord>> {
  const parsed = createValueDeliverySchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const delivery = await createValueDelivery(actor, parsed.data, valueDeliveryDeps());
    revalidateValueDelivery(delivery);
    return delivery;
  });
}

export async function updateValueDeliveryAction(
  input: unknown,
): Promise<ActionResult<ValueDeliveryRecord>> {
  const parsed = updateValueDeliverySchema.safeParse(input);
  if (!parsed.success) {
    return zodFailure(parsed.error);
  }

  return runAction(async () => {
    const actor = await requireActiveUser();
    const delivery = await updateValueDelivery(actor, parsed.data, valueDeliveryDeps());
    revalidateValueDelivery(delivery);
    return delivery;
  });
}
