import type { Prisma } from "@/generated/prisma/client";
import type {
  ProjectInheritanceSnapshot,
  ProjectListFilter,
  ProjectListItem,
  ProjectRecord,
  ProjectWriteData,
} from "@/application/projects/types";

export type ProjectTx = Prisma.TransactionClient;

export interface ProjectRepository {
  findById(id: string, tx?: ProjectTx): Promise<ProjectRecord | null>;
  findActiveByNameNormalized(
    nameNormalized: string,
    tx?: ProjectTx,
  ): Promise<{ id: string; name: string } | null>;
  list(filter: ProjectListFilter): Promise<ProjectListItem[]>;
  create(data: ProjectWriteData, actorId: string, tx: ProjectTx): Promise<ProjectRecord>;
  update(id: string, data: ProjectWriteData, actorId: string, tx: ProjectTx): Promise<ProjectRecord>;
  cancel(id: string, actorId: string, tx: ProjectTx): Promise<ProjectRecord>;
  listActiveInheritanceSnapshots(): Promise<ProjectInheritanceSnapshot[]>;
}
