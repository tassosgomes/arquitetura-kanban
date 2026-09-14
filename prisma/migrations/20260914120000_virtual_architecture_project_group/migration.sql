-- Projects use the fixed virtual Architecture group; no nominal project owner is persisted.
ALTER TABLE "projects" DROP CONSTRAINT "projects_architectureOwnerId_fkey";
ALTER TABLE "projects" DROP COLUMN "architectureOwnerId";
