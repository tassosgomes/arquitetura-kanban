-- T06 relational model. Replaces T05 SchemaHealth.
-- Extra objects below (Prisma cannot express them in schema.prisma):
--   * UNIQUE partial indexes on nameNormalized (DE-14)
--   * CHECK activities.type / projectId
--   * CHECK completedDate/cancelledDate >= startDate when both are present
--   * CHECK version >= 1; oidc issuer/subject and catalog names non-blank
-- Do not drop these in later `migrate dev` diffs; they are intentional.

-- CreateEnum
CREATE TYPE "nature" AS ENUM ('STRATEGIC', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "architecture_role" AS ENUM ('RESPONSIBLE', 'CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "activity_type" AS ENUM ('PROJECT', 'AD_HOC');

-- CreateEnum
CREATE TYPE "activity_status" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "effort" AS ENUM ('P', 'M', 'G');

-- CreateEnum
CREATE TYPE "audit_entity_kind" AS ENUM ('User', 'Area', 'Domain', 'Project', 'Activity', 'ActivityTask', 'ValueDelivery');

-- DropTable
DROP TABLE "SchemaHealth";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "oidcIssuer" TEXT NOT NULL,
    "oidcSubject" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "lastLoginAt" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_oidc_identity_nonempty" CHECK (btrim("oidcIssuer") <> '' AND btrim("oidcSubject") <> '')
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "areas_name_nonempty" CHECK (btrim("name") <> '')
);

-- CreateTable
CREATE TABLE "architecture_domains" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "architecture_domains_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "architecture_domains_name_nonempty" CHECK (btrim("name") <> '')
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "description" TEXT,
    "responsibleAreaId" UUID NOT NULL,
    "externalResponsible" TEXT,
    "architectureOwnerId" UUID NOT NULL,
    "nature" "nature" NOT NULL,
    "architectureRole" "architecture_role" NOT NULL,
    "startDate" DATE,
    "expectedEndDate" DATE,
    "status" "project_status" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_name_nonempty" CHECK (btrim("name") <> ''),
    CONSTRAINT "projects_version_positive" CHECK ("version" >= 1)
);

-- CreateTable
CREATE TABLE "project_participants" (
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "project_participants_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "activity_type" NOT NULL,
    "projectId" UUID,
    "requestingAreaId" UUID NOT NULL,
    "nature" "nature" NOT NULL,
    "domainId" UUID NOT NULL,
    "architectureRole" "architecture_role" NOT NULL,
    "ownerId" UUID NOT NULL,
    "priority" "priority" NOT NULL,
    "effort" "effort",
    "status" "activity_status" NOT NULL,
    "startDate" DATE,
    "expectedEndDate" DATE,
    "completedDate" DATE,
    "cancelledDate" DATE,
    "observations" TEXT,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activities_title_nonempty" CHECK (btrim("title") <> ''),
    CONSTRAINT "activities_version_positive" CHECK ("version" >= 1),
    CONSTRAINT "activities_type_project_id_check" CHECK (
        ("type" = 'PROJECT' AND "projectId" IS NOT NULL)
        OR ("type" = 'AD_HOC' AND "projectId" IS NULL)
    ),
    CONSTRAINT "activities_completed_date_gte_start_check" CHECK (
        "completedDate" IS NULL OR "startDate" IS NULL OR "completedDate" >= "startDate"
    ),
    CONSTRAINT "activities_cancelled_date_gte_start_check" CHECK (
        "cancelledDate" IS NULL OR "startDate" IS NULL OR "cancelledDate" >= "startDate"
    )
);

-- CreateTable
CREATE TABLE "activity_involved_areas" (
    "activityId" UUID NOT NULL,
    "areaId" UUID NOT NULL,

    CONSTRAINT "activity_involved_areas_pkey" PRIMARY KEY ("activityId","areaId")
);

-- CreateTable
CREATE TABLE "activity_participants" (
    "activityId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "activity_participants_pkey" PRIMARY KEY ("activityId","userId")
);

-- CreateTable
CREATE TABLE "activity_tasks" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "activity_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value_deliveries" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "referenceDate" DATE NOT NULL,
    "authorId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "value_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "value_deliveries_version_positive" CHECK ("version" >= 1)
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" UUID NOT NULL,
    "entityKind" "audit_entity_kind" NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "activityId" UUID,
    "projectId" UUID,
    "changes" JSONB NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime_event" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realtime_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_oidcIssuer_oidcSubject_key" ON "users"("oidcIssuer", "oidcSubject");

-- CreateIndex
CREATE INDEX "areas_isActive_idx" ON "areas"("isActive");

-- DE-14: only one active area per normalized name. Inactive rows may reuse the key.
CREATE UNIQUE INDEX "areas_name_normalized_active_key" ON "areas"("nameNormalized") WHERE "isActive" = TRUE;

-- CreateIndex
CREATE INDEX "architecture_domains_isActive_idx" ON "architecture_domains"("isActive");

CREATE UNIQUE INDEX "architecture_domains_name_normalized_active_key" ON "architecture_domains"("nameNormalized") WHERE "isActive" = TRUE;

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- DE-14: active project = status <> CANCELLED.
CREATE UNIQUE INDEX "projects_name_normalized_active_key" ON "projects"("nameNormalized") WHERE "status" <> 'CANCELLED';

-- CreateIndex
CREATE INDEX "project_participants_userId_idx" ON "project_participants"("userId");

-- CreateIndex
CREATE INDEX "activities_status_idx" ON "activities"("status");

-- CreateIndex
CREATE INDEX "activities_ownerId_idx" ON "activities"("ownerId");

-- CreateIndex
CREATE INDEX "activities_projectId_idx" ON "activities"("projectId");

-- CreateIndex
CREATE INDEX "activities_domainId_idx" ON "activities"("domainId");

-- CreateIndex
CREATE INDEX "activities_requestingAreaId_idx" ON "activities"("requestingAreaId");

-- CreateIndex
CREATE INDEX "activities_startDate_idx" ON "activities"("startDate");

-- CreateIndex
CREATE INDEX "activities_completedDate_idx" ON "activities"("completedDate");

-- CreateIndex
CREATE INDEX "activity_involved_areas_areaId_idx" ON "activity_involved_areas"("areaId");

-- CreateIndex
CREATE INDEX "activity_participants_userId_idx" ON "activity_participants"("userId");

-- CreateIndex
CREATE INDEX "activity_tasks_activityId_sortOrder_idx" ON "activity_tasks"("activityId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "audit_events_sequence_key" ON "audit_events"("sequence");

-- CreateIndex
CREATE INDEX "audit_events_entityKind_entityId_occurredAt_idx" ON "audit_events"("entityKind", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_activityId_occurredAt_idx" ON "audit_events"("activityId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_occurredAt_sequence_idx" ON "audit_events"("occurredAt", "sequence");

-- CreateIndex
CREATE INDEX "realtime_event_createdAt_idx" ON "realtime_event"("createdAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_responsibleAreaId_fkey" FOREIGN KEY ("responsibleAreaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_architectureOwnerId_fkey" FOREIGN KEY ("architectureOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_requestingAreaId_fkey" FOREIGN KEY ("requestingAreaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "architecture_domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_involved_areas" ADD CONSTRAINT "activity_involved_areas_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_involved_areas" ADD CONSTRAINT "activity_involved_areas_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participants" ADD CONSTRAINT "activity_participants_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participants" ADD CONSTRAINT "activity_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_tasks" ADD CONSTRAINT "activity_tasks_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_deliveries" ADD CONSTRAINT "value_deliveries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_deliveries" ADD CONSTRAINT "value_deliveries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
