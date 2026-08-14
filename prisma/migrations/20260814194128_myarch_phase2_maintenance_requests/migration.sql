-- MYARCH Phase 2 (§3.1–§3.7) — Maintenance & the Generic Request System,
-- built on top of the Task/Follow-up Engine (§3.8, already migrated).
--
-- Generated via `prisma migrate diff` against the post-Task-Engine schema,
-- with the diff's spurious `DROP INDEX .._searchVector_idx` / `ALTER COLUMN
-- "searchVector" DROP DEFAULT` statements manually removed — the same known
-- Prisma limitation diffing `Unsupported("tsvector")` GENERATED ALWAYS ...
-- STORED columns already documented in the two prior MYARCH migrations.
-- Applying those statements would drop the full-text search GIN indexes and
-- corrupt those generated columns; they are not a real intended change here
-- either.
--
-- Neither maintenance_issues/requests nor their attachment tables carry a
-- foreign key to tasks — `taskId` is a deliberately plain, unconstrained
-- pointer to the linked Task (mirrors Task.relatedEntityId's own identical
-- FK-less convention), so the Task Engine itself needs no schema change to
-- support these two new domains.

-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('ELECTRICAL', 'PLUMBING', 'FURNITURE', 'HVAC', 'NETWORK', 'CLASSROOM_STUDIO', 'LAB', 'EQUIPMENT', 'CLEANING', 'SAFETY', 'CIVIL_BUILDING', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceIssueStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RequestDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "maintenance_issues" (
    "id" UUID NOT NULL,
    "category" "MaintenanceCategory" NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceIssueStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requesterId" UUID NOT NULL,
    "assigneeId" UUID,
    "deadline" TIMESTAMP(3),
    "taskId" UUID,
    "resolutionDetails" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_attachments" (
    "id" UUID NOT NULL,
    "issueId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requesterId" UUID NOT NULL,
    "ownerId" UUID,
    "deadline" TIMESTAMP(3),
    "taskId" UUID,
    "decision" "RequestDecision",
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_attachments" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_issues_taskId_key" ON "maintenance_issues"("taskId");

-- CreateIndex
CREATE INDEX "maintenance_issues_status_idx" ON "maintenance_issues"("status");

-- CreateIndex
CREATE INDEX "maintenance_issues_requesterId_idx" ON "maintenance_issues"("requesterId");

-- CreateIndex
CREATE INDEX "maintenance_issues_assigneeId_idx" ON "maintenance_issues"("assigneeId");

-- CreateIndex
CREATE INDEX "maintenance_issues_category_idx" ON "maintenance_issues"("category");

-- CreateIndex
CREATE INDEX "maintenance_attachments_issueId_idx" ON "maintenance_attachments"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "requests_taskId_key" ON "requests"("taskId");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE INDEX "requests_requesterId_idx" ON "requests"("requesterId");

-- CreateIndex
CREATE INDEX "requests_ownerId_idx" ON "requests"("ownerId");

-- CreateIndex
CREATE INDEX "request_attachments_requestId_idx" ON "request_attachments"("requestId");

-- AddForeignKey
ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "maintenance_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
