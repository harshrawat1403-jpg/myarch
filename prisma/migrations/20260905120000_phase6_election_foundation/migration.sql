-- CreateEnum
CREATE TYPE "ElectionType" AS ENUM ('COUNCIL', 'CORE_COMMITTEE');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'APPLICATION_OPEN', 'APPLICATION_CLOSED');

-- CreateEnum
CREATE TYPE "ElectionVoterGroup" AS ENUM ('STUDENT', 'FACULTY', 'EX_COUNCIL');

-- CreateEnum
CREATE TYPE "ElectionCandidateStatus" AS ENUM ('APPLIED');

-- CreateTable
CREATE TABLE "elections" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "type" "ElectionType" NOT NULL,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "applicationOpenAt" TIMESTAMP(3) NOT NULL,
    "applicationCloseAt" TIMESTAMP(3) NOT NULL,
    "correctionOpenAt" TIMESTAMP(3),
    "correctionCloseAt" TIMESTAMP(3),
    "campaignEnabled" BOOLEAN NOT NULL DEFAULT false,
    "campaignOpenAt" TIMESTAMP(3),
    "campaignCloseAt" TIMESTAMP(3),
    "maxPositionsPerCandidate" INTEGER NOT NULL DEFAULT 1,
    "studentQuorumPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "facultyQuorumPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "exCouncilQuorumPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "configurationLockedAt" TIMESTAMP(3),
    "configurationLockedByUserId" UUID,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_positions" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "election_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_position_weights" (
    "id" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "voterGroup" "ElectionVoterGroup" NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "election_position_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_application_forms" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_application_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_candidates" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "applicantUserId" UUID NOT NULL,
    "status" "ElectionCandidateStatus" NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "election_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_candidate_positions" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "positionId" UUID NOT NULL,

    CONSTRAINT "election_candidate_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "elections_status_applicationOpenAt_applicationCloseAt_idx" ON "elections"("status", "applicationOpenAt", "applicationCloseAt");

-- CreateIndex
CREATE INDEX "elections_academicYear_type_idx" ON "elections"("academicYear", "type");

-- CreateIndex
CREATE INDEX "election_positions_electionId_displayOrder_idx" ON "election_positions"("electionId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "election_positions_electionId_identityKey_key" ON "election_positions"("electionId", "identityKey");

-- CreateIndex
CREATE UNIQUE INDEX "election_positions_id_electionId_key" ON "election_positions"("id", "electionId");

-- CreateIndex
CREATE UNIQUE INDEX "election_position_weights_positionId_voterGroup_key" ON "election_position_weights"("positionId", "voterGroup");

-- CreateIndex
CREATE UNIQUE INDEX "election_application_forms_electionId_key" ON "election_application_forms"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "election_application_forms_formId_key" ON "election_application_forms"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "election_candidates_applicationId_key" ON "election_candidates"("applicationId");

-- CreateIndex
CREATE INDEX "election_candidates_applicantUserId_idx" ON "election_candidates"("applicantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "election_candidates_electionId_applicantUserId_key" ON "election_candidates"("electionId", "applicantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "election_candidates_id_electionId_key" ON "election_candidates"("id", "electionId");

-- CreateIndex
CREATE INDEX "election_candidate_positions_positionId_electionId_idx" ON "election_candidate_positions"("positionId", "electionId");

-- CreateIndex
CREATE UNIQUE INDEX "election_candidate_positions_candidateId_positionId_key" ON "election_candidate_positions"("candidateId", "positionId");

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_configurationLockedByUserId_fkey" FOREIGN KEY ("configurationLockedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_positions" ADD CONSTRAINT "election_positions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_position_weights" ADD CONSTRAINT "election_position_weights_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "election_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_application_forms" ADD CONSTRAINT "election_application_forms_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_application_forms" ADD CONSTRAINT "election_application_forms_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "form_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidate_positions" ADD CONSTRAINT "election_candidate_positions_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidate_positions" ADD CONSTRAINT "election_candidate_positions_positionId_electionId_fkey" FOREIGN KEY ("positionId", "electionId") REFERENCES "election_positions"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma cannot express these range/chronology constraints in the schema DSL.
ALTER TABLE "elections" ADD CONSTRAINT "elections_application_window_check"
  CHECK ("applicationOpenAt" < "applicationCloseAt");
ALTER TABLE "elections" ADD CONSTRAINT "elections_academic_year_check"
  CHECK ("academicYear" ~ '^[0-9]{4}-[0-9]{4}$' AND substring("academicYear", 6, 4)::integer = substring("academicYear", 1, 4)::integer + 1);
ALTER TABLE "elections" ADD CONSTRAINT "elections_limits_check"
  CHECK ("maxPositionsPerCandidate" BETWEEN 1 AND 100 AND "studentQuorumPercent" BETWEEN 0 AND 100 AND "facultyQuorumPercent" BETWEEN 0 AND 100 AND "exCouncilQuorumPercent" BETWEEN 0 AND 100);
ALTER TABLE "elections" ADD CONSTRAINT "elections_lock_metadata_check"
  CHECK (("status" = 'DRAFT' AND "configurationLockedAt" IS NULL AND "configurationLockedByUserId" IS NULL) OR ("status" <> 'DRAFT' AND "configurationLockedAt" IS NOT NULL AND "configurationLockedByUserId" IS NOT NULL));
ALTER TABLE "election_positions" ADD CONSTRAINT "election_positions_seats_order_check"
  CHECK ("seats" > 0 AND "displayOrder" >= 0);
ALTER TABLE "election_position_weights" ADD CONSTRAINT "election_position_weights_percentage_check"
  CHECK ("percentage" BETWEEN 0 AND 100);
