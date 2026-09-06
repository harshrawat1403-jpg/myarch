-- Phase 6 Slice 5: Council-only verification, certification, publication and appointment history.
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'VERIFICATION';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'CERTIFIED';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'MEMBERSHIP_CONFIRMED';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

CREATE TYPE "ElectionVerificationOutcome" AS ENUM ('VERIFIED', 'FAILED_VERIFICATION');

CREATE UNIQUE INDEX "election_result_snapshots_id_electionId_key" ON "election_result_snapshots"("id", "electionId");
CREATE UNIQUE INDEX "election_position_results_id_snapshotId_electionId_key" ON "election_position_results"("id", "snapshotId", "electionId");

CREATE TABLE "election_result_verifier_assignments" (
  "id" UUID NOT NULL,
  "electionId" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "verifierUserId" UUID NOT NULL,
  "assignedByUserId" UUID NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_result_verifier_assignments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_result_verifications" (
  "id" UUID NOT NULL,
  "electionId" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "assignmentId" UUID NOT NULL,
  "verifierUserId" UUID NOT NULL,
  "outcome" "ElectionVerificationOutcome" NOT NULL,
  "note" TEXT,
  "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_result_verifications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_certifications" (
  "id" UUID NOT NULL,
  "electionId" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "certifiedByUserId" UUID NOT NULL,
  "note" TEXT,
  "certifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_certifications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_result_publications" (
  "id" UUID NOT NULL,
  "electionId" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "publishedByUserId" UUID NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_result_publications_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_appointments" (
  "id" UUID NOT NULL,
  "electionId" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "positionResultId" UUID NOT NULL,
  "appointedUserId" UUID NOT NULL,
  "committeeId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "confirmedByUserId" UUID NOT NULL,
  "appointedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "election_appointments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "election_result_verifier_assignments_electionId_key" ON "election_result_verifier_assignments"("electionId");
CREATE UNIQUE INDEX "election_result_verifier_assignments_snapshotId_key" ON "election_result_verifier_assignments"("snapshotId");
CREATE UNIQUE INDEX "election_result_verifier_assignments_snapshotId_electionId_key" ON "election_result_verifier_assignments"("snapshotId", "electionId");
CREATE INDEX "election_result_verifier_assignments_verifierUserId_idx" ON "election_result_verifier_assignments"("verifierUserId");
CREATE UNIQUE INDEX "election_result_verifications_assignmentId_key" ON "election_result_verifications"("assignmentId");
CREATE UNIQUE INDEX "election_result_verifications_snapshotId_key" ON "election_result_verifications"("snapshotId");
CREATE UNIQUE INDEX "election_result_verifications_snapshotId_electionId_key" ON "election_result_verifications"("snapshotId", "electionId");
CREATE INDEX "election_result_verifications_electionId_finalizedAt_idx" ON "election_result_verifications"("electionId", "finalizedAt");
CREATE UNIQUE INDEX "election_certifications_snapshotId_key" ON "election_certifications"("snapshotId");
CREATE UNIQUE INDEX "election_certifications_snapshotId_electionId_key" ON "election_certifications"("snapshotId", "electionId");
CREATE INDEX "election_certifications_electionId_certifiedAt_idx" ON "election_certifications"("electionId", "certifiedAt");
CREATE UNIQUE INDEX "election_result_publications_snapshotId_key" ON "election_result_publications"("snapshotId");
CREATE UNIQUE INDEX "election_result_publications_snapshotId_electionId_key" ON "election_result_publications"("snapshotId", "electionId");
CREATE INDEX "election_result_publications_electionId_publishedAt_idx" ON "election_result_publications"("electionId", "publishedAt");
CREATE UNIQUE INDEX "election_appointments_positionResultId_key" ON "election_appointments"("positionResultId");
CREATE UNIQUE INDEX "election_appointments_membershipId_key" ON "election_appointments"("membershipId");
CREATE UNIQUE INDEX "election_appointments_electionId_positionResultId_key" ON "election_appointments"("electionId", "positionResultId");
CREATE UNIQUE INDEX "election_appointments_positionResultId_snapshotId_electionId_key" ON "election_appointments"("positionResultId", "snapshotId", "electionId");
CREATE INDEX "election_appointments_electionId_snapshotId_idx" ON "election_appointments"("electionId", "snapshotId");

-- The preflight before this migration verified these partial unique indexes have no legacy conflicts.
CREATE UNIQUE INDEX "committees_active_student_council_year_key" ON "committees"("type", "academicYear") WHERE "type" = 'STUDENT_COUNCIL' AND "status" = 'ACTIVE';
CREATE UNIQUE INDEX "committee_memberships_active_committee_user_key" ON "committee_memberships"("committeeId", "userId") WHERE "isActive";
CREATE UNIQUE INDEX "committee_memberships_active_committee_position_key" ON "committee_memberships"("committeeId", "position") WHERE "isActive" AND "position" IS NOT NULL;

ALTER TABLE "election_result_verifier_assignments" ADD CONSTRAINT "election_result_verifier_assignments_snapshotId_electionId_fkey" FOREIGN KEY ("snapshotId", "electionId") REFERENCES "election_result_snapshots"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_result_verifier_assignments" ADD CONSTRAINT "election_result_verifier_assignments_verifierUserId_fkey" FOREIGN KEY ("verifierUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_result_verifier_assignments" ADD CONSTRAINT "election_result_verifier_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_result_verifications" ADD CONSTRAINT "election_result_verifications_snapshotId_electionId_fkey" FOREIGN KEY ("snapshotId", "electionId") REFERENCES "election_result_snapshots"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_result_verifications" ADD CONSTRAINT "election_result_verifications_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "election_result_verifier_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_result_verifications" ADD CONSTRAINT "election_result_verifications_verifierUserId_fkey" FOREIGN KEY ("verifierUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_certifications" ADD CONSTRAINT "election_certifications_snapshotId_electionId_fkey" FOREIGN KEY ("snapshotId", "electionId") REFERENCES "election_result_snapshots"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_certifications" ADD CONSTRAINT "election_certifications_certifiedByUserId_fkey" FOREIGN KEY ("certifiedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_result_publications" ADD CONSTRAINT "election_result_publications_snapshotId_electionId_fkey" FOREIGN KEY ("snapshotId", "electionId") REFERENCES "election_result_snapshots"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_result_publications" ADD CONSTRAINT "election_result_publications_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_appointments" ADD CONSTRAINT "election_appointments_snapshotId_electionId_fkey" FOREIGN KEY ("snapshotId", "electionId") REFERENCES "election_result_snapshots"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_appointments" ADD CONSTRAINT "election_appointments_positionResultId_snapshotId_electionId_fkey" FOREIGN KEY ("positionResultId", "snapshotId", "electionId") REFERENCES "election_position_results"("id", "snapshotId", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_appointments" ADD CONSTRAINT "election_appointments_appointedUserId_fkey" FOREIGN KEY ("appointedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_appointments" ADD CONSTRAINT "election_appointments_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_appointments" ADD CONSTRAINT "election_appointments_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "committee_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_appointments" ADD CONSTRAINT "election_appointments_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "prevent_election_slice5_history_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Election verification, certification, publication and appointment history is immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "election_result_verifications_immutable" BEFORE UPDATE OR DELETE ON "election_result_verifications" FOR EACH ROW EXECUTE FUNCTION "prevent_election_slice5_history_mutation"();
CREATE TRIGGER "election_certifications_immutable" BEFORE UPDATE OR DELETE ON "election_certifications" FOR EACH ROW EXECUTE FUNCTION "prevent_election_slice5_history_mutation"();
CREATE TRIGGER "election_result_publications_immutable" BEFORE UPDATE OR DELETE ON "election_result_publications" FOR EACH ROW EXECUTE FUNCTION "prevent_election_slice5_history_mutation"();
CREATE TRIGGER "election_appointments_immutable" BEFORE UPDATE OR DELETE ON "election_appointments" FOR EACH ROW EXECUTE FUNCTION "prevent_election_slice5_history_mutation"();