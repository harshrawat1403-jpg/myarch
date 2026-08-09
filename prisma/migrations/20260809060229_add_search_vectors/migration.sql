-- V4.0 E6 (PRD §15/§19) — full-text search over the 4 searchable entities.
-- Each column is a Postgres GENERATED ALWAYS AS ... STORED tsvector, kept
-- automatically in sync by Postgres itself on every INSERT/UPDATE (no
-- application-code write path, no risk of drifting out of sync with the
-- source columns) — this is why these are declared Unsupported("tsvector")
-- in schema.prisma rather than plain nullable columns Prisma would try to
-- manage. GIN-indexed for `@@` full-text query performance, not ILIKE scans.

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("fullName", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("rollNumber", '')), 'B')
  ) STORED;
CREATE INDEX "student_profiles_searchVector_idx" ON "student_profiles" USING GIN ("searchVector");

-- AlterTable
ALTER TABLE "companies" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("name", ''))) STORED;
CREATE INDEX "companies_searchVector_idx" ON "companies" USING GIN ("searchVector");

-- AlterTable
ALTER TABLE "placement_drives" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", ''))) STORED;
CREATE INDEX "placement_drives_searchVector_idx" ON "placement_drives" USING GIN ("searchVector");

-- AlterTable
ALTER TABLE "publications" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", ''))) STORED;
CREATE INDEX "publications_searchVector_idx" ON "publications" USING GIN ("searchVector");
