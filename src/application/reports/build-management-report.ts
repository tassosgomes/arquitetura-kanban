import type { LocalUser } from "@/domain/identity/local-user";
import { aggregateManagementSnapshot } from "@/application/reports/aggregate";
import {
  loadManagementPopulation,
  type ManagementSnapshotDeps,
} from "@/application/reports/compute-management-snapshot";
import {
  collectAssociatedProjects,
  toManagementReportRow,
  type AssociatedProject,
  type ManagementReportRow,
} from "@/application/reports/report-rows";
import type { ManagementQuery, ManagementSnapshot } from "@/application/reports/types";

export type ManagementReport = {
  snapshot: ManagementSnapshot;
  activities: ManagementReportRow[];
  associatedProjects: AssociatedProject[];
};

/**
 * Same population P and snapshot as the dashboard (`computeManagementSnapshot`),
 * plus activity rows and associated projects for the detailed report / CSV.
 */
export async function buildManagementReport(
  actor: LocalUser,
  query: ManagementQuery,
  deps: ManagementSnapshotDeps,
): Promise<ManagementReport> {
  const loaded = await loadManagementPopulation(actor, query, deps);
  const snapshot = aggregateManagementSnapshot(
    loaded.population,
    loaded.labels,
    loaded.fechamento,
  );
  const portraitById = new Map(loaded.population.map((row) => [row.id, row.portrait]));

  const activities = snapshot.populationIds.map((id) => {
    const portrait = portraitById.get(id);
    if (!portrait) {
      throw new Error(`Missing portrait for population id ${id}`);
    }
    return toManagementReportRow({
      id,
      title: loaded.listedById.get(id)?.title ?? "",
      portrait,
      labels: loaded.labels,
    });
  });

  return {
    snapshot,
    activities,
    associatedProjects: collectAssociatedProjects(loaded.population, loaded.labels),
  };
}
