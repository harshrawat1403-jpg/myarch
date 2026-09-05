ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'SCRUTINY';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'CORRECTIONS_OBJECTIONS';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'SHORTLIST';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'INTERVIEWS';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'FINAL_CANDIDATES';
ALTER TYPE "ElectionCandidateStatus" ADD VALUE IF NOT EXISTS 'ELIGIBLE';
ALTER TYPE "ElectionCandidateStatus" ADD VALUE IF NOT EXISTS 'INELIGIBLE';
ALTER TYPE "ElectionCandidateStatus" ADD VALUE IF NOT EXISTS 'CORRECTION_REQUIRED';
ALTER TYPE "ElectionCandidateStatus" ADD VALUE IF NOT EXISTS 'SHORTLISTED';
ALTER TYPE "ElectionCandidateStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "ElectionCandidateStatus" ADD VALUE IF NOT EXISTS 'FINAL_CANDIDATE';

CREATE TYPE "ElectionScrutinyDecision" AS ENUM ('ELIGIBLE', 'INELIGIBLE', 'CORRECTION_REQUIRED');
CREATE TYPE "ElectionCorrectionStatus" AS ENUM ('OPEN', 'SUBMITTED', 'RESOLVED', 'CANCELLED');
CREATE TYPE "ElectionObjectionStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ElectionInterviewStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "election_scrutiny_reviews" (
  "id" UUID NOT NULL, "electionId" UUID NOT NULL, "candidateId" UUID NOT NULL,
  "decision" "ElectionScrutinyDecision" NOT NULL, "reason" TEXT NOT NULL,
  "reviewerUserId" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_scrutiny_reviews_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_correction_requests" (
  "id" UUID NOT NULL, "electionId" UUID NOT NULL, "candidateId" UUID NOT NULL,
  "instructions" TEXT NOT NULL, "status" "ElectionCorrectionStatus" NOT NULL DEFAULT 'OPEN',
  "requestedByUserId" UUID NOT NULL, "resolvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_correction_requests_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_correction_submissions" (
  "id" UUID NOT NULL, "correctionRequestId" UUID NOT NULL, "submittedByUserId" UUID NOT NULL,
  "statement" TEXT NOT NULL, "evidenceReference" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_correction_submissions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_objections" (
  "id" UUID NOT NULL, "electionId" UUID NOT NULL, "candidateId" UUID NOT NULL,
  "objectorUserId" UUID NOT NULL, "reason" TEXT NOT NULL, "evidenceReference" TEXT,
  "status" "ElectionObjectionStatus" NOT NULL DEFAULT 'OPEN', "reviewedByUserId" UUID,
  "decisionReason" TEXT, "resolvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_objections_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_shortlist_entries" (
  "id" UUID NOT NULL, "electionId" UUID NOT NULL, "candidateId" UUID NOT NULL,
  "positionId" UUID NOT NULL, "shortlistedByUserId" UUID NOT NULL,
  "shortlistedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_shortlist_entries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_interview_criteria" (
  "id" UUID NOT NULL, "electionId" UUID NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL,
  "maxScore" DECIMAL(7,2) NOT NULL, "weight" DECIMAL(7,2) NOT NULL DEFAULT 1,
  "displayOrder" INTEGER NOT NULL, "required" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "election_interview_criteria_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_interviews" (
  "id" UUID NOT NULL, "electionId" UUID NOT NULL, "candidateId" UUID NOT NULL, "positionId" UUID NOT NULL,
  "status" "ElectionInterviewStatus" NOT NULL DEFAULT 'PLANNED', "scheduledAt" TIMESTAMP(3),
  "durationMinutes" INTEGER, "mode" TEXT, "location" TEXT, "candidateAttended" BOOLEAN,
  "completedAt" TIMESTAMP(3), "scoresLockedAt" TIMESTAMP(3), "scheduledByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "election_interviews_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_interview_panel_members" (
  "id" UUID NOT NULL, "interviewId" UUID NOT NULL, "userId" UUID NOT NULL, "panelRole" TEXT,
  "conflictDeclaredAt" TIMESTAMP(3), "isRecused" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_interview_panel_members_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_interview_scores" (
  "id" UUID NOT NULL, "interviewId" UUID NOT NULL, "panelMemberId" UUID NOT NULL, "criterionId" UUID NOT NULL,
  "score" DECIMAL(7,2) NOT NULL, "comments" TEXT, "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "election_interview_scores_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_final_candidates" (
  "id" UUID NOT NULL, "electionId" UUID NOT NULL, "candidateId" UUID NOT NULL, "positionId" UUID NOT NULL,
  "lockedByUserId" UUID NOT NULL, "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_final_candidates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "election_scrutiny_reviews_candidateId_createdAt_idx" ON "election_scrutiny_reviews"("candidateId", "createdAt");
CREATE INDEX "election_scrutiny_reviews_electionId_decision_idx" ON "election_scrutiny_reviews"("electionId", "decision");
CREATE INDEX "election_correction_requests_candidateId_status_idx" ON "election_correction_requests"("candidateId", "status");
CREATE INDEX "election_correction_requests_electionId_status_idx" ON "election_correction_requests"("electionId", "status");
CREATE UNIQUE INDEX "election_correction_submissions_correctionRequestId_key" ON "election_correction_submissions"("correctionRequestId");
CREATE INDEX "election_objections_candidateId_status_idx" ON "election_objections"("candidateId", "status");
CREATE INDEX "election_objections_electionId_status_idx" ON "election_objections"("electionId", "status");
CREATE UNIQUE INDEX "election_shortlist_entries_candidateId_positionId_key" ON "election_shortlist_entries"("candidateId", "positionId");
CREATE INDEX "election_shortlist_entries_electionId_positionId_idx" ON "election_shortlist_entries"("electionId", "positionId");
CREATE UNIQUE INDEX "election_interview_criteria_electionId_displayOrder_key" ON "election_interview_criteria"("electionId", "displayOrder");
CREATE INDEX "election_interview_criteria_electionId_idx" ON "election_interview_criteria"("electionId");
CREATE UNIQUE INDEX "election_interviews_candidateId_positionId_key" ON "election_interviews"("candidateId", "positionId");
CREATE INDEX "election_interviews_electionId_status_scheduledAt_idx" ON "election_interviews"("electionId", "status", "scheduledAt");
CREATE UNIQUE INDEX "election_interview_panel_members_interviewId_userId_key" ON "election_interview_panel_members"("interviewId", "userId");
CREATE INDEX "election_interview_panel_members_userId_isRecused_idx" ON "election_interview_panel_members"("userId", "isRecused");
CREATE UNIQUE INDEX "election_interview_scores_interviewId_panelMemberId_criterionId_key" ON "election_interview_scores"("interviewId", "panelMemberId", "criterionId");
CREATE INDEX "election_interview_scores_interviewId_idx" ON "election_interview_scores"("interviewId");
CREATE UNIQUE INDEX "election_final_candidates_candidateId_positionId_key" ON "election_final_candidates"("candidateId", "positionId");
CREATE INDEX "election_final_candidates_electionId_positionId_idx" ON "election_final_candidates"("electionId", "positionId");
CREATE UNIQUE INDEX "election_correction_requests_one_active_candidate" ON "election_correction_requests"("candidateId") WHERE "status" IN ('OPEN', 'SUBMITTED');

ALTER TABLE "election_scrutiny_reviews" ADD CONSTRAINT "election_scrutiny_reviews_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_scrutiny_reviews" ADD CONSTRAINT "election_scrutiny_reviews_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_scrutiny_reviews" ADD CONSTRAINT "election_scrutiny_reviews_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_correction_requests" ADD CONSTRAINT "election_correction_requests_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_correction_requests" ADD CONSTRAINT "election_correction_requests_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_correction_requests" ADD CONSTRAINT "election_correction_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_correction_submissions" ADD CONSTRAINT "election_correction_submissions_correctionRequestId_fkey" FOREIGN KEY ("correctionRequestId") REFERENCES "election_correction_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_correction_submissions" ADD CONSTRAINT "election_correction_submissions_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_objections" ADD CONSTRAINT "election_objections_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_objections" ADD CONSTRAINT "election_objections_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_objections" ADD CONSTRAINT "election_objections_objectorUserId_fkey" FOREIGN KEY ("objectorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_objections" ADD CONSTRAINT "election_objections_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_shortlist_entries" ADD CONSTRAINT "election_shortlist_entries_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_shortlist_entries" ADD CONSTRAINT "election_shortlist_entries_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_shortlist_entries" ADD CONSTRAINT "election_shortlist_entries_positionId_electionId_fkey" FOREIGN KEY ("positionId", "electionId") REFERENCES "election_positions"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_shortlist_entries" ADD CONSTRAINT "election_shortlist_entries_shortlistedByUserId_fkey" FOREIGN KEY ("shortlistedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interview_criteria" ADD CONSTRAINT "election_interview_criteria_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interviews" ADD CONSTRAINT "election_interviews_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interviews" ADD CONSTRAINT "election_interviews_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interviews" ADD CONSTRAINT "election_interviews_positionId_electionId_fkey" FOREIGN KEY ("positionId", "electionId") REFERENCES "election_positions"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interviews" ADD CONSTRAINT "election_interviews_scheduledByUserId_fkey" FOREIGN KEY ("scheduledByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interview_panel_members" ADD CONSTRAINT "election_interview_panel_members_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "election_interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interview_panel_members" ADD CONSTRAINT "election_interview_panel_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interview_scores" ADD CONSTRAINT "election_interview_scores_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "election_interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interview_scores" ADD CONSTRAINT "election_interview_scores_panelMemberId_fkey" FOREIGN KEY ("panelMemberId") REFERENCES "election_interview_panel_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_interview_scores" ADD CONSTRAINT "election_interview_scores_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "election_interview_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_final_candidates" ADD CONSTRAINT "election_final_candidates_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_final_candidates" ADD CONSTRAINT "election_final_candidates_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_final_candidates" ADD CONSTRAINT "election_final_candidates_positionId_electionId_fkey" FOREIGN KEY ("positionId", "electionId") REFERENCES "election_positions"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_final_candidates" ADD CONSTRAINT "election_final_candidates_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "election_interview_criteria" ADD CONSTRAINT "election_interview_criteria_scores_check" CHECK ("maxScore" > 0 AND "weight" > 0 AND "displayOrder" >= 0);
ALTER TABLE "election_interviews" ADD CONSTRAINT "election_interviews_schedule_check" CHECK (("durationMinutes" IS NULL OR "durationMinutes" > 0) AND ("scoresLockedAt" IS NULL OR "completedAt" IS NOT NULL));
ALTER TABLE "election_interview_scores" ADD CONSTRAINT "election_interview_scores_nonnegative_check" CHECK ("score" >= 0);
