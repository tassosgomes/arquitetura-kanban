import { describe, expect, it } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Nature, Priority } from "@/domain/catalog/classifications";
import { createActivitySchema } from "@/application/activities/schemas";

const areaId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const domainId = "33333333-3333-4333-8333-333333333333";
const projectId = "44444444-4444-4444-8444-444444444444";

function activityInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Revisar integrações",
    description: "",
    observations: "",
    type: ActivityType.AD_HOC,
    projectId: "",
    requestingAreaId: areaId,
    domainId,
    nature: Nature.STRATEGIC,
    architectureRole: ArchitectureRole.RESPONSIBLE,
    ownerId,
    participantIds: [],
    involvedAreaIds: [],
    priority: Priority.MEDIUM,
    effort: "",
    status: ActivityStatus.BACKLOG,
    startDate: "",
    expectedEndDate: "",
    completedDate: "",
    ...overrides,
  };
}

describe("createActivitySchema: erros obrigatórios em uma rodada", () => {
  it("returns every required ad hoc field error in one parse", () => {
    const result = createActivitySchema.safeParse(
      activityInput({
        title: "",
        requestingAreaId: "",
        domainId: "",
        nature: "",
        architectureRole: "",
        ownerId: "",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors).toMatchObject({
      title: ["Informe um título."],
      requestingAreaId: ["Selecione a área solicitante."],
      domainId: ["Selecione uma categoria."],
      nature: ["Selecione a natureza."],
      architectureRole: ["Selecione o papel da Arquitetura."],
      ownerId: ["Selecione exatamente um responsável."],
    });
    expect(Object.keys(result.error.flatten().fieldErrors)).toHaveLength(6);
    expect(Object.values(result.error.flatten().fieldErrors).flat()).not.toContain(
      "Identificador inválido.",
    );
  });

  it("keeps project inheritance optional during schema validation", () => {
    const result = createActivitySchema.safeParse(
      activityInput({
        type: ActivityType.PROJECT,
        projectId,
        requestingAreaId: "",
        nature: "",
        architectureRole: "",
        ownerId: "",
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestingAreaId).toBeUndefined();
      expect(result.data.nature).toBeUndefined();
      expect(result.data.architectureRole).toBeUndefined();
      expect(result.data.ownerId).toBeUndefined();
    }
  });

  it("keeps the technical UUID message for present malformed values", () => {
    const result = createActivitySchema.safeParse(
      activityInput({
        requestingAreaId: "not-a-uuid",
        domainId: "also-not-a-uuid",
        ownerId: "still-not-a-uuid",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors).toMatchObject({
      requestingAreaId: ["Identificador inválido."],
      domainId: ["Identificador inválido."],
      ownerId: ["Identificador inválido."],
    });
  });
});
