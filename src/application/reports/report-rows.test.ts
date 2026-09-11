import { describe, expect, it } from "vitest";
import { ActivityStatus, ActivityType } from "@/domain/activity/enums";
import { ArchitectureRole, Effort, Nature, Priority } from "@/domain/catalog/classifications";
import {
  PORTRAIT_ABSENT,
  emptyActivityPortrait,
  type ReconstructedActivityPortrait,
} from "@/application/audit";
import { EFFORT_UNSET_LABEL } from "@/application/reports/aggregate";
import {
  REPORT_CSV_HEADERS,
  collectAssociatedProjects,
  managementReportCsvRecords,
  toManagementReportRow,
} from "@/application/reports/report-rows";
import type { ManagementLabelMaps } from "@/application/reports/types";

const labels: ManagementLabelMaps = {
  areas: new Map([["ar-fin", "Financeiro"]]),
  domains: new Map([["d-arq", "Arquitetura"]]),
  users: new Map([["u-ana", "Ana"]]),
  projects: new Map([["p-erp", "Implantação ERP"]]),
};

function portrait(
  overrides: Partial<ReconstructedActivityPortrait> = {},
): ReconstructedActivityPortrait {
  return {
    ...emptyActivityPortrait({
      status: ActivityStatus.DONE,
      responsavelId: "u-ana",
      areaSolicitanteId: "ar-fin",
      dominioId: "d-arq",
      natureza: Nature.OPERATIONAL,
      papelArquitetura: ArchitectureRole.RESPONSIBLE,
      tipo: ActivityType.PROJECT,
      projetoId: "p-erp",
      esforco: Effort.M,
      prioridade: Priority.HIGH,
      dataInicio: "2026-08-25",
      dataConclusao: "2026-09-18",
      dataCancelamento: null,
      previsaoTermino: "2026-09-20",
    }),
    ...overrides,
  };
}

describe("management report rows (T27)", () => {
  it("maps portrait dimensions and CSV headers in the contracted order", () => {
    const row = toManagementReportRow({
      id: "a-1",
      title: 'Revisão "=CMD"',
      portrait: portrait(),
      labels,
    });
    expect(row.status).toBe("Concluído");
    expect(row.statusKey).toBe(ActivityStatus.DONE);
    expect(row.type).toBe("Projeto");
    expect(row.project).toBe("Implantação ERP");
    expect(row.requestingArea).toBe("Financeiro");
    expect(row.owner).toBe("Ana");
    expect(row.startDate).toBe("2026-08-25");
    expect(row.completedDate).toBe("2026-09-18");
    expect(row.forecastDate).toBe("2026-09-20");

    const records = managementReportCsvRecords([row]);
    expect(records[0]).toEqual([...REPORT_CSV_HEADERS]);
    expect(records[1]?.[0]).toBe("a-1");
    expect(records[1]?.[1]).toBe('Revisão "=CMD"');
    expect(records[1]?.[3]).toBe("Concluído");
  });

  it("leaves AUSENTE empty and maps null effort to Não informado", () => {
    const row = toManagementReportRow({
      id: "a-absent",
      title: "Corrigida",
      portrait: portrait({
        status: PORTRAIT_ABSENT,
        esforco: PORTRAIT_ABSENT,
        dataInicio: PORTRAIT_ABSENT,
      }),
      labels,
    });
    expect(row.status).toBe("");
    expect(row.statusKey).toBeNull();
    expect(row.effort).toBe("");
    expect(row.startDate).toBe("");

    const unset = toManagementReportRow({
      id: "a-unset",
      title: "Sem esforço",
      portrait: portrait({ esforco: null }),
      labels,
    });
    expect(unset.effort).toBe(EFFORT_UNSET_LABEL);
  });

  it("lists distinct associated projects matching I-03", () => {
    const projects = collectAssociatedProjects(
      [
        { portrait: portrait() },
        { portrait: portrait() },
        { portrait: portrait({ tipo: ActivityType.AD_HOC, projetoId: "p-erp" }) },
        { portrait: portrait({ status: PORTRAIT_ABSENT }) },
      ],
      labels,
    );
    expect(projects).toEqual([{ id: "p-erp", name: "Implantação ERP" }]);
  });
});
