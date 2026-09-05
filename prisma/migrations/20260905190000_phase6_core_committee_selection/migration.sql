-- CreateEnum
CREATE TYPE "CoreCommitteeSelectionStatus" AS ENUM ('DRAFT', 'APPLICATION_OPEN', 'APPLICATION_CLOSED', 'SCRUTINY', 'CORRECTIONS', 'SHORTLIST', 'INTERVIEWS', 'COUNCIL_REVIEW', 'SELECTION_DECIDED', 'PUBLISHED', 'MEMBERSHIP_CONFIRMED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CoreCommitteeSelectionCandidateStatus" AS ENUM ('APPLIED', 'ELIGIBLE', 'INELIGIBLE', 'CORRECTION_REQUIRED', 'SHORTLISTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CoreCommitteeSelectionCorrectionStatus" AS ENUM ('OPEN', 'SUBMITTED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoreCommitteeSelectionInterviewStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoreCommitteeSelectionDecisionOutcome" AS ENUM ('SELECTED', 'NOT_SELECTED');

-- CreateEnum
CREATE TYPE "CoreCommitteeSelectionDecisionState" AS ENUM ('RECORDED', 'FINALIZED');

-- CreateTable
CREATE TABLE "core_committee_selections" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "status" "CoreCommitteeSelectionStatus" NOT NULL DEFAULT 'DRAFT',
    "applicationOpenAt" TIMESTAMP(3) NOT NULL,
    "applicationCloseAt" TIMESTAMP(3) NOT NULL,
    "correctionOpenAt" TIMESTAMP(3),
    "correctionCloseAt" TIMESTAMP(3),
    "maxPositionsPerCandidate" INTEGER NOT NULL DEFAULT 1,
    "configurationLockedAt" TIMESTAMP(3),
    "configurationLockedByUserId" UUID,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_committee_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_positions" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_committee_selection_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_application_forms" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_committee_selection_application_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_candidates" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "applicantUserId" UUID NOT NULL,
    "status" "CoreCommitteeSelectionCandidateStatus" NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_committee_selection_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_candidate_positions" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "positionId" UUID NOT NULL,

    CONSTRAINT "core_committee_selection_candidate_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_scrutiny_reviews" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "decision" "CoreCommitteeSelectionCandidateStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_committee_selection_scrutiny_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_correction_requests" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" "CoreCommitteeSelectionCorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "requestedByUserId" UUID NOT NULL,
    "statement" TEXT,
    "submittedByUserId" UUID,
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_committee_selection_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_shortlist_entries" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "shortlistedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_committee_selection_shortlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_interviews" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "status" "CoreCommitteeSelectionInterviewStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "mode" TEXT,
    "location" TEXT,
    "candidateAttended" BOOLEAN,
    "completedAt" TIMESTAMP(3),
    "scheduledByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_committee_selection_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_council_reviews" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "councilCommitteeId" UUID NOT NULL,
    "councilMemberUserId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_committee_council_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_committee_selection_decisions" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "councilCommitteeId" UUID NOT NULL,
    "outcome" "CoreCommitteeSelectionDecisionOutcome" NOT NULL,
    "state" "CoreCommitteeSelectionDecisionState" NOT NULL DEFAULT 'RECORDED',
    "internalNote" TEXT NOT NULL,
    "decidedByUserId" UUID NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedByUserId" UUID,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_committee_selection_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "core_committee_selections_status_applicationOpenAt_applicat_idx" ON "core_committee_selections"("status", "applicationOpenAt", "applicationCloseAt");

-- CreateIndex
CREATE INDEX "core_committee_selections_academicYear_status_idx" ON "core_committee_selections"("academicYear", "status");

-- CreateIndex
CREATE INDEX "core_committee_selection_positions_selectionId_displayOrder_idx" ON "core_committee_selection_positions"("selectionId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_positions_selectionId_identityKey_key" ON "core_committee_selection_positions"("selectionId", "identityKey");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_positions_id_selectionId_key" ON "core_committee_selection_positions"("id", "selectionId");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_application_forms_selectionId_key" ON "core_committee_selection_application_forms"("selectionId");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_application_forms_formId_key" ON "core_committee_selection_application_forms"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_candidates_applicationId_key" ON "core_committee_selection_candidates"("applicationId");

-- CreateIndex
CREATE INDEX "core_committee_selection_candidates_applicantUserId_idx" ON "core_committee_selection_candidates"("applicantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_candidates_selectionId_applicantUs_key" ON "core_committee_selection_candidates"("selectionId", "applicantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_candidates_id_selectionId_key" ON "core_committee_selection_candidates"("id", "selectionId");

-- CreateIndex
CREATE INDEX "core_committee_selection_candidate_positions_positionId_sel_idx" ON "core_committee_selection_candidate_positions"("positionId", "selectionId");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_candidate_positions_candidateId_po_key" ON "core_committee_selection_candidate_positions"("candidateId", "positionId");

-- CreateIndex
CREATE INDEX "core_committee_selection_scrutiny_reviews_candidateId_creat_idx" ON "core_committee_selection_scrutiny_reviews"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "core_committee_selection_scrutiny_reviews_selectionId_decis_idx" ON "core_committee_selection_scrutiny_reviews"("selectionId", "decision");

-- CreateIndex
CREATE INDEX "core_committee_selection_correction_requests_selectionId_candidateId_idx" ON "core_committee_selection_correction_requests"("selectionId", "candidateId");
CREATE INDEX "core_committee_selection_correction_requests_status_idx" ON "core_committee_selection_correction_requests"("status");

-- CreateIndex
CREATE INDEX "core_committee_selection_shortlist_entries_selectionId_posi_idx" ON "core_committee_selection_shortlist_entries"("selectionId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_shortlist_entries_candidateId_posi_key" ON "core_committee_selection_shortlist_entries"("candidateId", "positionId");

-- CreateIndex
CREATE INDEX "core_committee_selection_interviews_selectionId_status_sche_idx" ON "core_committee_selection_interviews"("selectionId", "status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_interviews_candidateId_positionId_key" ON "core_committee_selection_interviews"("candidateId", "positionId");

-- CreateIndex
CREATE INDEX "core_committee_council_reviews_selectionId_councilCommittee_idx" ON "core_committee_council_reviews"("selectionId", "councilCommitteeId");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_council_reviews_candidateId_positionId_counc_key" ON "core_committee_council_reviews"("candidateId", "positionId", "councilMemberUserId");

-- CreateIndex
CREATE INDEX "core_committee_selection_decisions_selectionId_state_idx" ON "core_committee_selection_decisions"("selectionId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "core_committee_selection_decisions_candidateId_positionId_key" ON "core_committee_selection_decisions"("candidateId", "positionId");

-- AddForeignKey
ALTER TABLE "core_committee_selections" ADD CONSTRAINT "core_committee_selections_configurationLockedByUserId_fkey" FOREIGN KEY ("configurationLockedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selections" ADD CONSTRAINT "core_committee_selections_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_positions" ADD CONSTRAINT "core_committee_selection_positions_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_application_forms" ADD CONSTRAINT "core_committee_selection_application_forms_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_application_forms" ADD CONSTRAINT "core_committee_selection_application_forms_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_candidates" ADD CONSTRAINT "core_committee_selection_candidates_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_candidates" ADD CONSTRAINT "core_committee_selection_candidates_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "form_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_candidates" ADD CONSTRAINT "core_committee_selection_candidates_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_candidate_positions" ADD CONSTRAINT "core_committee_selection_candidate_positions_candidateId_s_fkey" FOREIGN KEY ("candidateId", "selectionId") REFERENCES "core_committee_selection_candidates"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_candidate_positions" ADD CONSTRAINT "core_committee_selection_candidate_positions_positionId_se_fkey" FOREIGN KEY ("positionId", "selectionId") REFERENCES "core_committee_selection_positions"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_scrutiny_reviews" ADD CONSTRAINT "core_committee_selection_scrutiny_reviews_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_scrutiny_reviews" ADD CONSTRAINT "core_committee_selection_scrutiny_reviews_candidateId_sele_fkey" FOREIGN KEY ("candidateId", "selectionId") REFERENCES "core_committee_selection_candidates"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_scrutiny_reviews" ADD CONSTRAINT "core_committee_selection_scrutiny_reviews_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_correction_requests" ADD CONSTRAINT "core_committee_selection_correction_requests_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_correction_requests" ADD CONSTRAINT "core_committee_selection_correction_requests_candidateId_s_fkey" FOREIGN KEY ("candidateId", "selectionId") REFERENCES "core_committee_selection_candidates"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_correction_requests" ADD CONSTRAINT "core_committee_selection_correction_requests_requestedByUs_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_committee_selection_correction_requests" ADD CONSTRAINT "core_committee_selection_correction_requests_submittedBy_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_shortlist_entries" ADD CONSTRAINT "core_committee_selection_shortlist_entries_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_shortlist_entries" ADD CONSTRAINT "core_committee_selection_shortlist_entries_candidateId_sel_fkey" FOREIGN KEY ("candidateId", "selectionId") REFERENCES "core_committee_selection_candidates"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_shortlist_entries" ADD CONSTRAINT "core_committee_selection_shortlist_entries_positionId_sele_fkey" FOREIGN KEY ("positionId", "selectionId") REFERENCES "core_committee_selection_positions"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_shortlist_entries" ADD CONSTRAINT "core_committee_selection_shortlist_entries_shortlistedByUs_fkey" FOREIGN KEY ("shortlistedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_interviews" ADD CONSTRAINT "core_committee_selection_interviews_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_interviews" ADD CONSTRAINT "core_committee_selection_interviews_candidateId_selectionI_fkey" FOREIGN KEY ("candidateId", "selectionId") REFERENCES "core_committee_selection_candidates"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_interviews" ADD CONSTRAINT "core_committee_selection_interviews_positionId_selectionId_fkey" FOREIGN KEY ("positionId", "selectionId") REFERENCES "core_committee_selection_positions"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_interviews" ADD CONSTRAINT "core_committee_selection_interviews_scheduledByUserId_fkey" FOREIGN KEY ("scheduledByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_council_reviews" ADD CONSTRAINT "core_committee_council_reviews_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_council_reviews" ADD CONSTRAINT "core_committee_council_reviews_candidateId_selectionId_fkey" FOREIGN KEY ("candidateId", "selectionId") REFERENCES "core_committee_selection_candidates"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_council_reviews" ADD CONSTRAINT "core_committee_council_reviews_positionId_selectionId_fkey" FOREIGN KEY ("positionId", "selectionId") REFERENCES "core_committee_selection_positions"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_council_reviews" ADD CONSTRAINT "core_committee_council_reviews_councilCommitteeId_fkey" FOREIGN KEY ("councilCommitteeId") REFERENCES "committees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_council_reviews" ADD CONSTRAINT "core_committee_council_reviews_councilMemberUserId_fkey" FOREIGN KEY ("councilMemberUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_decisions" ADD CONSTRAINT "core_committee_selection_decisions_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_decisions" ADD CONSTRAINT "core_committee_selection_decisions_candidateId_selectionId_fkey" FOREIGN KEY ("candidateId", "selectionId") REFERENCES "core_committee_selection_candidates"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_decisions" ADD CONSTRAINT "core_committee_selection_decisions_positionId_selectionId_fkey" FOREIGN KEY ("positionId", "selectionId") REFERENCES "core_committee_selection_positions"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_decisions" ADD CONSTRAINT "core_committee_selection_decisions_councilCommitteeId_fkey" FOREIGN KEY ("councilCommitteeId") REFERENCES "committees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_decisions" ADD CONSTRAINT "core_committee_selection_decisions_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_committee_selection_decisions" ADD CONSTRAINT "core_committee_selection_decisions_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The Prisma schema cannot express these cross-field invariants.
ALTER TABLE "core_committee_selections" ADD CONSTRAINT "core_committee_selections_application_window_check"
  CHECK ("applicationOpenAt" < "applicationCloseAt");
ALTER TABLE "core_committee_selections" ADD CONSTRAINT "core_committee_selections_academic_year_check"
  CHECK ("academicYear" ~ '^[0-9]{4}-[0-9]{4}$' AND substring("academicYear", 6, 4)::integer = substring("academicYear", 1, 4)::integer + 1);
ALTER TABLE "core_committee_selections" ADD CONSTRAINT "core_committee_selections_limits_check"
  CHECK ("maxPositionsPerCandidate" BETWEEN 1 AND 100);
ALTER TABLE "core_committee_selections" ADD CONSTRAINT "core_committee_selections_lock_metadata_check"
  CHECK (("status" = 'DRAFT' AND "configurationLockedAt" IS NULL AND "configurationLockedByUserId" IS NULL) OR ("status" <> 'DRAFT' AND "configurationLockedAt" IS NOT NULL AND "configurationLockedByUserId" IS NOT NULL));
ALTER TABLE "core_committee_selection_positions" ADD CONSTRAINT "core_committee_selection_positions_seats_order_check"
  CHECK ("seats" > 0 AND "displayOrder" >= 0);
ALTER TABLE "core_committee_selection_interviews" ADD CONSTRAINT "core_committee_selection_interviews_schedule_check"
  CHECK (("durationMinutes" IS NULL OR "durationMinutes" > 0) AND ("completedAt" IS NULL OR "candidateAttended" IS NOT NULL));
ALTER TABLE "core_committee_selection_correction_requests" ADD CONSTRAINT "core_committee_selection_correction_submission_check"
  CHECK (("status" = 'OPEN' AND "statement" IS NULL AND "submittedByUserId" IS NULL AND "submittedAt" IS NULL) OR ("status" IN ('SUBMITTED', 'RESOLVED', 'CANCELLED')));
ALTER TABLE "core_committee_selection_decisions" ADD CONSTRAINT "core_committee_selection_decisions_finalization_check"
  CHECK (("state" = 'RECORDED' AND "finalizedByUserId" IS NULL AND "finalizedAt" IS NULL) OR ("state" = 'FINALIZED' AND "finalizedByUserId" IS NOT NULL AND "finalizedAt" IS NOT NULL));
