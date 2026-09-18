import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/composition", () => ({
  activityRepository: {},
  areaRepository: {},
  auditRepository: {},
  catalogUserRepository: {},
  domainRepository: {},
  prisma: {},
  projectRepository: {},
  requireActiveUser: vi.fn(),
}));

import {
  boardReturnHref,
  createAnotherActivityHref,
  newActivityHref,
} from "./page";

const FIRST_AREA_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_AREA_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const DOMAIN_ID = "44444444-4444-4444-8444-444444444444";

describe("contexto de criação da página do Kanban", () => {
  it("preserva filtros repetidos e remove avisos de uma criação anterior", () => {
    expect(
      boardReturnHref({
        area: [FIRST_AREA_ID, SECOND_AREA_ID],
        title: "MFA",
        created: "55555555-5555-4555-8555-555555555555",
        createdDomainId: DOMAIN_ID,
      }),
    ).toBe(`/kanban?area=${FIRST_AREA_ID}&area=${SECOND_AREA_ID}&title=MFA`);
  });

  it("transporta a origem filtrada ao abrir o cadastro", () => {
    const href = newActivityHref({ area: FIRST_AREA_ID, mine: "1" });
    const url = new URL(href, "https://example.test");

    expect(url.pathname).toBe("/activities/new");
    expect(url.searchParams.get("returnTo")).toBe(
      `/kanban?area=${FIRST_AREA_ID}&mine=1`,
    );
  });

  it("reabre o cadastro com projeto, área e categoria da atividade criada", () => {
    const href = createAnotherActivityHref(
      { status: "BACKLOG", created: "55555555-5555-4555-8555-555555555555" },
      { project: { id: PROJECT_ID }, requestingArea: { id: FIRST_AREA_ID } },
      DOMAIN_ID,
    );
    const url = new URL(href, "https://example.test");

    expect(url.pathname).toBe("/activities/new");
    expect(url.searchParams.get("projectId")).toBe(PROJECT_ID);
    expect(url.searchParams.get("prefillAreaId")).toBe(FIRST_AREA_ID);
    expect(url.searchParams.get("prefillDomainId")).toBe(DOMAIN_ID);
    expect(url.searchParams.get("returnTo")).toBe("/kanban?status=BACKLOG");
  });
});
