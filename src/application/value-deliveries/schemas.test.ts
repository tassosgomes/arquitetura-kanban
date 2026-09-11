import { describe, expect, it } from "vitest";
import {
  createValueDeliverySchema,
  updateValueDeliverySchema,
} from "@/application/value-deliveries/schemas";

const projectId = "11111111-1111-4111-8111-111111111111";
const deliveryId = "22222222-2222-4222-8222-222222222222";

function requiredCreate(overrides: Record<string, unknown> = {}) {
  return {
    projectId,
    title: "Revisão da arquitetura de integração",
    contentMarkdown: "## Valor entregue\n\n- Padrão de APIs",
    referenceDate: "2026-09-10",
    ...overrides,
  };
}

describe("value delivery schemas", () => {
  it("accepts required title, markdown and reference date", () => {
    const parsed = createValueDeliverySchema.safeParse(requiredCreate());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Revisão da arquitetura de integração");
      expect(parsed.data.referenceDate).toBe("2026-09-10");
    }
  });

  it("rejects a blank title", () => {
    const parsed = createValueDeliverySchema.safeParse(requiredCreate({ title: "   " }));
    expect(parsed.success).toBe(false);
  });

  it("rejects empty markdown content", () => {
    const parsed = createValueDeliverySchema.safeParse(requiredCreate({ contentMarkdown: "  " }));
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing or invalid reference date", () => {
    expect(
      createValueDeliverySchema.safeParse(requiredCreate({ referenceDate: "" })).success,
    ).toBe(false);
    expect(
      createValueDeliverySchema.safeParse(requiredCreate({ referenceDate: "2026-02-31" })).success,
    ).toBe(false);
  });

  it("requires version on update", () => {
    const parsed = updateValueDeliverySchema.safeParse({
      id: deliveryId,
      title: "Título",
      contentMarkdown: "Conteúdo",
      referenceDate: "2026-09-10",
    });
    expect(parsed.success).toBe(false);
  });
});
