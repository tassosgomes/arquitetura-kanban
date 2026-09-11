import { ActivityStatus, ActivityType, ACTIVITY_TYPE_LABELS } from "@/domain/activity/enums";
import {
  ACTIVITY_NATURE_LABELS,
  ARCHITECTURE_ROLE_LABELS,
  ArchitectureRole,
  Effort,
  Nature,
} from "@/domain/catalog/classifications";
import { EFFORT_FILTER_UNSET } from "@/application/activities/types";
import {
  areaIdsFromPortrait,
  asPortraitId,
  isPortraitAbsent,
  isUsableActivityPortrait,
  type ReconstructedActivityPortrait,
} from "@/application/audit/reconstruct-portrait";
import { CANONICAL_AREA_NOTE } from "@/application/reports/canonical-notes";
import type {
  ManagementDistributionBucket,
  ManagementDistributions,
  ManagementIndicators,
  ManagementLabelMaps,
  ManagementSnapshot,
} from "@/application/reports/types";
import type { Instant } from "@/application/temporal";

export const EFFORT_UNSET_LABEL = "Não informado";

export type ManagementPopulationRow = {
  id: string;
  portrait: ReconstructedActivityPortrait;
};

const EFFORT_BUCKET_ORDER = [Effort.P, Effort.M, Effort.G, EFFORT_FILTER_UNSET] as const;

function emptyIndicators(): ManagementIndicators {
  return {
    "I-01": 0,
    "I-02": 0,
    "I-03": 0,
    "I-04": 0,
    "I-05": 0,
    "I-06": 0,
    "I-07": 0,
    "I-09": 0,
  };
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function labelOrFallback(
  labels: ReadonlyMap<string, string>,
  id: string,
  fallback: string,
): string {
  return labels.get(id) ?? fallback;
}

function bucketsFromCountMap(
  counts: Map<string, number>,
  labelOf: (key: string) => string,
): ManagementDistributionBucket[] {
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, label: labelOf(key), count }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}

function effortBuckets(counts: Map<string, number>): ManagementDistributionBucket[] {
  const labels: Record<(typeof EFFORT_BUCKET_ORDER)[number], string> = {
    [Effort.P]: Effort.P,
    [Effort.M]: Effort.M,
    [Effort.G]: Effort.G,
    [EFFORT_FILTER_UNSET]: EFFORT_UNSET_LABEL,
  };
  return EFFORT_BUCKET_ORDER.filter((key) => (counts.get(key) ?? 0) > 0).map((key) => ({
    key,
    label: labels[key],
    count: counts.get(key) ?? 0,
  }));
}

/** COUNT DISTINCT activity id — joins of areas/participants must not multiply I-01. */
export function distinctPopulation(rows: readonly ManagementPopulationRow[]): ManagementPopulationRow[] {
  const seen = new Set<string>();
  const unique: ManagementPopulationRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

export function aggregateManagementSnapshot(
  rows: readonly ManagementPopulationRow[],
  labels: ManagementLabelMaps,
  fechamento: Instant,
): ManagementSnapshot {
  const population = distinctPopulation(rows);
  const indicators = emptyIndicators();
  indicators["I-01"] = population.length;

  const projectIds = new Set<string>();
  const areaUniverse = new Set<string>();
  const areaCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();
  const ownerCounts = new Map<string, number>();
  const natureCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  const effortCounts = new Map<string, number>();

  for (const row of population) {
    const { portrait } = row;
    if (!isUsableActivityPortrait(portrait)) {
      continue;
    }

    const status = portrait.status;
    if (status === ActivityStatus.DONE) {
      indicators["I-02"] += 1;
    } else if (status === ActivityStatus.IN_PROGRESS) {
      indicators["I-05"] += 1;
    } else if (status === ActivityStatus.WAITING) {
      indicators["I-06"] += 1;
    } else if (status === ActivityStatus.BLOCKED) {
      indicators["I-07"] += 1;
    } else if (status === ActivityStatus.CANCELLED) {
      indicators["I-09"] += 1;
    }

    if (portrait.tipo === ActivityType.PROJECT) {
      const projectId = asPortraitId(portrait.projetoId);
      if (projectId) {
        projectIds.add(projectId);
      }
    }

    const areas = areaIdsFromPortrait(portrait);
    for (const areaId of areas) {
      areaUniverse.add(areaId);
      increment(areaCounts, areaId);
    }

    const domainId = asPortraitId(portrait.dominioId);
    if (domainId) {
      increment(domainCounts, domainId);
    }

    const ownerId = asPortraitId(portrait.responsavelId);
    if (ownerId) {
      increment(ownerCounts, ownerId);
    }

    if (portrait.natureza === Nature.STRATEGIC || portrait.natureza === Nature.OPERATIONAL) {
      increment(natureCounts, portrait.natureza);
    }

    if (portrait.tipo === ActivityType.PROJECT || portrait.tipo === ActivityType.AD_HOC) {
      increment(typeCounts, portrait.tipo);
    }

    if (
      portrait.papelArquitetura === ArchitectureRole.RESPONSIBLE ||
      portrait.papelArquitetura === ArchitectureRole.CONTRIBUTOR
    ) {
      increment(roleCounts, portrait.papelArquitetura);
    }

    if (isPortraitAbsent(portrait.esforco)) {
      continue;
    }
    if (portrait.esforco === Effort.P || portrait.esforco === Effort.M || portrait.esforco === Effort.G) {
      increment(effortCounts, portrait.esforco);
    } else {
      increment(effortCounts, EFFORT_FILTER_UNSET);
    }
  }

  indicators["I-03"] = projectIds.size;
  indicators["I-04"] = areaUniverse.size;

  const distributions: ManagementDistributions = {
    "D-AREA": bucketsFromCountMap(areaCounts, (id) =>
      labelOrFallback(labels.areas, id, "Área sem identificação"),
    ),
    "D-DOMINIO": bucketsFromCountMap(domainCounts, (id) =>
      labelOrFallback(labels.domains, id, "Domínio sem identificação"),
    ),
    "D-RESPONSAVEL": bucketsFromCountMap(ownerCounts, (id) =>
      labelOrFallback(labels.users, id, "Usuário sem identificação"),
    ),
    "D-NATUREZA": bucketsFromCountMap(natureCounts, (key) =>
      ACTIVITY_NATURE_LABELS[key as Nature] ?? key,
    ),
    "D-TIPO": bucketsFromCountMap(
      typeCounts,
      (key) => ACTIVITY_TYPE_LABELS[key as ActivityType] ?? key,
    ),
    "D-PAPEL": bucketsFromCountMap(roleCounts, (key) =>
      ARCHITECTURE_ROLE_LABELS[key as ArchitectureRole] ?? key,
    ),
    "D-ESFORCO": effortBuckets(effortCounts),
  };

  return {
    indicators,
    distributions,
    populationIds: population.map((row) => row.id),
    fechamento,
    canonicalAreaNote: CANONICAL_AREA_NOTE,
  };
}
