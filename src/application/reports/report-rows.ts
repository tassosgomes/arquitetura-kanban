import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TYPE_LABELS,
  ActivityStatus,
  ActivityType,
} from "@/domain/activity/enums";
import {
  ACTIVITY_NATURE_LABELS,
  ARCHITECTURE_ROLE_LABELS,
  Effort,
  PRIORITY_LABELS,
} from "@/domain/catalog/classifications";
import {
  asPortraitId,
  isPortraitAbsent,
  isUsableActivityPortrait,
  type PortraitFieldValue,
  type ReconstructedActivityPortrait,
} from "@/application/audit/reconstruct-portrait";
import { EFFORT_UNSET_LABEL } from "@/application/reports/aggregate";
import type { ManagementLabelMaps } from "@/application/reports/types";

export const REPORT_CSV_HEADERS = [
  "id",
  "título",
  "tipo",
  "status",
  "projeto",
  "área solicitante",
  "domínio",
  "natureza",
  "papel",
  "responsável",
  "prioridade",
  "esforço",
  "data início",
  "conclusão",
  "cancelamento",
  "previsão",
] as const;

export type ManagementReportRow = {
  id: string;
  title: string;
  type: string;
  typeKey: ActivityType | null;
  status: string;
  statusKey: ActivityStatus | null;
  project: string;
  projectId: string | null;
  requestingArea: string;
  domain: string;
  nature: string;
  role: string;
  owner: string;
  priority: string;
  effort: string;
  startDate: string;
  completedDate: string;
  cancelledDate: string;
  forecastDate: string;
};

export type AssociatedProject = {
  id: string;
  name: string;
};

function portraitString(value: PortraitFieldValue): string | null {
  if (isPortraitAbsent(value) || value == null) {
    return null;
  }
  return typeof value === "string" ? value : null;
}

function labeledEnum(value: PortraitFieldValue, labels: Record<string, string>): string {
  const text = portraitString(value);
  if (!text) {
    return "";
  }
  return labels[text] ?? text;
}

function labeledId(
  value: PortraitFieldValue,
  labels: ReadonlyMap<string, string>,
  fallback: string,
): { id: string | null; label: string } {
  const id = asPortraitId(value);
  if (!id) {
    return { id: null, label: "" };
  }
  return { id, label: labels.get(id) ?? fallback };
}

function portraitCivilDate(value: PortraitFieldValue): string {
  const text = portraitString(value);
  return text ? text.slice(0, 10) : "";
}

function isActivityStatus(value: string): value is ActivityStatus {
  return Object.values(ActivityStatus).includes(value as ActivityStatus);
}

function isActivityType(value: string): value is ActivityType {
  return Object.values(ActivityType).includes(value as ActivityType);
}

function effortLabel(value: PortraitFieldValue): string {
  if (isPortraitAbsent(value)) {
    return "";
  }
  if (value === Effort.P || value === Effort.M || value === Effort.G) {
    return value;
  }
  return EFFORT_UNSET_LABEL;
}

export function toManagementReportRow(input: {
  id: string;
  title: string;
  portrait: ReconstructedActivityPortrait;
  labels: ManagementLabelMaps;
}): ManagementReportRow {
  const { portrait, labels } = input;
  const typeText = portraitString(portrait.tipo);
  const statusText = portraitString(portrait.status);
  const project = labeledId(portrait.projetoId, labels.projects, "Projeto sem identificação");
  const area = labeledId(portrait.areaSolicitanteId, labels.areas, "Área sem identificação");
  const domain = labeledId(portrait.dominioId, labels.domains, "Domínio sem identificação");
  const owner = labeledId(portrait.responsavelId, labels.users, "Usuário sem identificação");

  return {
    id: input.id,
    title: input.title,
    type: labeledEnum(portrait.tipo, ACTIVITY_TYPE_LABELS),
    typeKey: typeText && isActivityType(typeText) ? typeText : null,
    status: labeledEnum(portrait.status, ACTIVITY_STATUS_LABELS),
    statusKey: statusText && isActivityStatus(statusText) ? statusText : null,
    project: project.label,
    projectId: project.id,
    requestingArea: area.label,
    domain: domain.label,
    nature: labeledEnum(portrait.natureza, ACTIVITY_NATURE_LABELS),
    role: labeledEnum(portrait.papelArquitetura, ARCHITECTURE_ROLE_LABELS),
    owner: owner.label,
    priority: labeledEnum(portrait.prioridade, PRIORITY_LABELS),
    effort: effortLabel(portrait.esforco),
    startDate: portraitCivilDate(portrait.dataInicio),
    completedDate: portraitCivilDate(portrait.dataConclusao),
    cancelledDate: portraitCivilDate(portrait.dataCancelamento),
    forecastDate: portraitCivilDate(portrait.previsaoTermino),
  };
}

export function reportRowToCsvCells(row: ManagementReportRow): string[] {
  return [
    row.id,
    row.title,
    row.type,
    row.status,
    row.project,
    row.requestingArea,
    row.domain,
    row.nature,
    row.role,
    row.owner,
    row.priority,
    row.effort,
    row.startDate,
    row.completedDate,
    row.cancelledDate,
    row.forecastDate,
  ];
}

export function managementReportCsvRecords(rows: readonly ManagementReportRow[]): string[][] {
  return [[...REPORT_CSV_HEADERS], ...rows.map(reportRowToCsvCells)];
}

/** Distinct projects in P with tipo*=Projeto — same set as I-03. */
export function collectAssociatedProjects(
  population: readonly { portrait: ReconstructedActivityPortrait }[],
  labels: ManagementLabelMaps,
): AssociatedProject[] {
  const seen = new Map<string, string>();
  for (const row of population) {
    if (!isUsableActivityPortrait(row.portrait)) {
      continue;
    }
    if (row.portrait.tipo !== ActivityType.PROJECT) {
      continue;
    }
    const id = asPortraitId(row.portrait.projetoId);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.set(id, labels.projects.get(id) ?? "Projeto sem identificação");
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
