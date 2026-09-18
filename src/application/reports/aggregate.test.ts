import { describe, expect, it } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import { EFFORT_FILTER_UNSET } from "@/application/activities/types";
import {
  PORTRAIT_ABSENT,
  emptyActivityPortrait,
  type ReconstructedActivityPortrait,
} from "@/application/audit";
import {
  CANONICAL_AREA_NOTE,
  EFFORT_UNSET_LABEL,
  aggregateManagementSnapshot,
} from "@/application/reports";
import { matchesManagementFilters } from "@/application/reports/filters";
import type { ManagementLabelMaps } from "@/application/reports/types";

const FECHAMENTO = new Date("2026-09-10T15:00:00-03:00");

const labels: ManagementLabelMaps = {
  areas: new Map([
    ["ar-fin", "Financeiro"],
    ["ar-ti", "TI"],
    ["ar-rh", "RH"],
  ]),
  domains: new Map([["d-arq", "Arquitetura"]]),
  users: new Map([
    ["u-ana", "Ana"],
    ["u-carlos", "Carlos"],
  ]),
  projects: new Map([
    ["p-erp", "Implantação ERP"],
    ["p-data", "Plataforma de Dados"],
  ]),
};

function present(
  overrides: Partial<ReconstructedActivityPortrait>,
): ReconstructedActivityPortrait {
  return {
    ...emptyActivityPortrait({
      status: ActivityStatus.IN_PROGRESS,
      responsavelId: "u-ana",
      participanteIds: [],
      areaSolicitanteId: "ar-fin",
      areaEnvolvidaIds: [],
      dominioId: "d-arq",
      natureza: Nature.OPERATIONAL,
      papelArquitetura: ArchitectureRole.RESPONSIBLE,
      tipo: ActivityType.AD_HOC,
      projetoId: null,
      esforco: Effort.M,
      prioridade: Priority.MEDIUM,
    }),
    ...overrides,
  };
}

function absent(): ReconstructedActivityPortrait {
  return present({
    status: PORTRAIT_ABSENT,
    responsavelId: PORTRAIT_ABSENT,
    participanteIds: PORTRAIT_ABSENT,
    areaSolicitanteId: PORTRAIT_ABSENT,
    areaEnvolvidaIds: PORTRAIT_ABSENT,
    dominioId: PORTRAIT_ABSENT,
    natureza: PORTRAIT_ABSENT,
    papelArquitetura: PORTRAIT_ABSENT,
    tipo: PORTRAIT_ABSENT,
    projetoId: PORTRAIT_ABSENT,
    esforco: PORTRAIT_ABSENT,
    prioridade: PORTRAIT_ABSENT,
    dataInicio: PORTRAIT_ABSENT,
    dataConclusao: PORTRAIT_ABSENT,
    dataCancelamento: PORTRAIT_ABSENT,
    previsaoTermino: PORTRAIT_ABSENT,
  });
}

function counts(buckets: { key: string; count: number }[]): Record<string, number> {
  return Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket.count]));
}

describe("aggregateManagementSnapshot", () => {
  it("counts distinct activities and overlapping areas without multiplying I-01 (FX-10)", () => {
    const a1 = present({
      tipo: ActivityType.PROJECT,
      projetoId: "p-erp",
      areaSolicitanteId: "ar-fin",
      areaEnvolvidaIds: ["ar-ti", "ar-rh"],
      esforco: Effort.M,
    });
    const a2 = present({
      tipo: ActivityType.PROJECT,
      projetoId: "p-data",
      areaSolicitanteId: "ar-ti",
      areaEnvolvidaIds: ["ar-rh"],
      esforco: null,
    });

    const snapshot = aggregateManagementSnapshot(
      [
        { id: "a1", portrait: a1 },
        { id: "a1", portrait: a1 },
        { id: "a2", portrait: a2 },
      ],
      labels,
      FECHAMENTO,
    );

    expect(snapshot.indicators["I-01"]).toBe(2);
    expect(snapshot.indicators["I-03"]).toBe(2);
    expect(snapshot.indicators["I-04"]).toBe(3);
    expect(snapshot.indicators["I-05"]).toBe(2);
    expect(counts(snapshot.distributions["D-AREA"])).toEqual({
      "ar-fin": 1,
      "ar-ti": 2,
      "ar-rh": 2,
    });
    const areaSum = snapshot.distributions["D-AREA"].reduce((sum, bucket) => sum + bucket.count, 0);
    expect(areaSum).toBe(5);
    expect(areaSum).toBeGreaterThan(snapshot.indicators["I-01"]);
    expect(snapshot.canonicalAreaNote).toBe(CANONICAL_AREA_NOTE);
    expect(counts(snapshot.distributions["D-ESFORCO"])).toEqual({
      [Effort.M]: 1,
      [EFFORT_FILTER_UNSET]: 1,
    });
    expect(snapshot.distributions["D-ESFORCO"].find((bucket) => bucket.key === EFFORT_FILTER_UNSET)?.label).toBe(
      EFFORT_UNSET_LABEL,
    );
    expect(snapshot.populationIds).toEqual(["a1", "a2"]);
  });

  it("counts a repeated solicitante in involved areas once (FX-10b / DE-19)", () => {
    const snapshot = aggregateManagementSnapshot(
      [
        {
          id: "a-dup",
          portrait: present({
            areaSolicitanteId: "ar-fin",
            areaEnvolvidaIds: ["ar-fin", "ar-ti"],
          }),
        },
      ],
      labels,
      FECHAMENTO,
    );

    expect(snapshot.indicators["I-01"]).toBe(1);
    expect(snapshot.indicators["I-04"]).toBe(2);
    expect(counts(snapshot.distributions["D-AREA"])).toEqual({ "ar-fin": 1, "ar-ti": 1 });
  });

  it("puts null effort in Não informado and never imputes M (FX-11)", () => {
    const snapshot = aggregateManagementSnapshot(
      [
        { id: "a-p", portrait: present({ esforco: Effort.P }) },
        { id: "a-m", portrait: present({ esforco: Effort.M }) },
        { id: "a-g", portrait: present({ esforco: Effort.G }) },
        { id: "a-nulo", portrait: present({ esforco: null }) },
      ],
      labels,
      FECHAMENTO,
    );

    expect(snapshot.indicators["I-01"]).toBe(4);
    expect(counts(snapshot.distributions["D-ESFORCO"])).toEqual({
      [Effort.P]: 1,
      [Effort.M]: 1,
      [Effort.G]: 1,
      [EFFORT_FILTER_UNSET]: 1,
    });
  });

  it("includes cancelled in I-01/I-09/D-* and not in I-02/I-05 (DE-18)", () => {
    const snapshot = aggregateManagementSnapshot(
      [
        {
          id: "a-canc",
          portrait: present({
            status: ActivityStatus.CANCELLED,
            tipo: ActivityType.PROJECT,
            projetoId: "p-data",
            areaSolicitanteId: "ar-ti",
            areaEnvolvidaIds: ["ar-fin"],
            esforco: Effort.P,
          }),
        },
        {
          id: "a-done",
          portrait: present({
            status: ActivityStatus.DONE,
            tipo: ActivityType.AD_HOC,
            projetoId: null,
            areaSolicitanteId: "ar-rh",
            areaEnvolvidaIds: [],
            esforco: Effort.G,
          }),
        },
      ],
      labels,
      FECHAMENTO,
    );

    expect(snapshot.indicators).toMatchObject({
      "I-01": 2,
      "I-02": 1,
      "I-03": 1,
      "I-04": 3,
      "I-05": 0,
      "I-09": 1,
    });
    expect(counts(snapshot.distributions["D-TIPO"])).toEqual({
      [ActivityType.PROJECT]: 1,
      [ActivityType.AD_HOC]: 1,
    });
  });

  it("keeps AUSENTE activities in I-01 but out of status indicators and D-* (DE-05)", () => {
    const snapshot = aggregateManagementSnapshot(
      [
        { id: "a-corrigida", portrait: absent() },
        { id: "a-ok", portrait: present({ status: ActivityStatus.IN_PROGRESS }) },
      ],
      labels,
      FECHAMENTO,
    );

    expect(snapshot.indicators["I-01"]).toBe(2);
    expect(snapshot.indicators["I-05"]).toBe(1);
    expect(snapshot.indicators["I-02"]).toBe(0);
    expect(snapshot.populationIds).toContain("a-corrigida");
    expect(snapshot.distributions["D-RESPONSAVEL"]).toHaveLength(1);
    expect(snapshot.distributions["D-AREA"].reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
  });
});

describe("matchesManagementFilters (DE-17)", () => {
  it("filters by historical owner and excludes AUSENTE", () => {
    const ana = present({ responsavelId: "u-ana" });
    const carlos = present({ responsavelId: "u-carlos" });
    expect(matchesManagementFilters(ana, { ownerId: "u-ana" })).toBe(true);
    expect(matchesManagementFilters(carlos, { ownerId: "u-ana" })).toBe(false);
    expect(matchesManagementFilters(absent(), { ownerId: "u-ana" })).toBe(false);
  });

  it("matches area against solicitante ∪ envolvidas", () => {
    const portrait = present({
      areaSolicitanteId: "ar-fin",
      areaEnvolvidaIds: ["ar-ti"],
    });
    expect(matchesManagementFilters(portrait, { areaId: "ar-ti" })).toBe(true);
    expect(matchesManagementFilters(portrait, { areaId: "ar-rh" })).toBe(false);
  });

  it("matches requesting area only against the historical solicitante", () => {
    const portrait = present({
      areaSolicitanteId: "ar-fin",
      areaEnvolvidaIds: ["ar-ti"],
    });

    expect(matchesManagementFilters(portrait, { requestingAreaId: "ar-fin" })).toBe(true);
    expect(matchesManagementFilters(portrait, { requestingAreaId: "ar-ti" })).toBe(false);
    expect(matchesManagementFilters(absent(), { requestingAreaId: "ar-fin" })).toBe(false);
  });
});
