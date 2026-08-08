-- CreateEnum
CREATE TYPE "RecruiterApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BulkRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "AcademicYearTransitionStatus" AS ENUM ('DRAFT', 'PENDING_CONFIRMATION', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "coordinator_profiles" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "recruiter_profiles" ADD COLUMN     "approvalStatus" "RecruiterApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "bulk_import_runs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "status" "BulkRunStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "errorReport" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "bulk_import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_year_transition_runs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "status" "AcademicYearTransitionStatus" NOT NULL DEFAULT 'DRAFT',
    "planJson" JSONB NOT NULL,
    "stepLog" JSONB NOT NULL DEFAULT '[]',
    "currentStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "academic_year_transition_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_import_runs_actorUserId_idx" ON "bulk_import_runs"("actorUserId");

-- CreateIndex
CREATE INDEX "academic_year_transition_runs_actorUserId_idx" ON "academic_year_transition_runs"("actorUserId");

-- AddForeignKey
ALTER TABLE "bulk_import_runs" ADD CONSTRAINT "bulk_import_runs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_import_runs" ADD CONSTRAINT "bulk_import_runs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_year_transition_runs" ADD CONSTRAINT "academic_year_transition_runs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
