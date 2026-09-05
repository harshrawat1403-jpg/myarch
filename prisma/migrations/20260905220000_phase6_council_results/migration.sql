-- Phase 6 Slice 4: Council-only counting and immutable result snapshots.
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'COUNTING';
ALTER TYPE "ElectionStatus" ADD VALUE IF NOT EXISTS 'RESULT_REVIEW';

CREATE TYPE "ElectionResultStatus" AS ENUM ('RESULT_REVIEW', 'QUORUM_FAILED', 'NOTA_WON', 'RUNOFF_REQUIRED');
CREATE TYPE "ElectionPositionResultStatus" AS ENUM ('WINNER_PENDING_VERIFICATION', 'QUORUM_FAILED', 'NOTA_WON', 'RUNOFF_REQUIRED');

-- A ballot records only its locked voter group, never a voter identifier.
-- Existing pre-Slice-4 ballots remain NULL and are rejected by authoritative
-- counting rather than being retrospectively attributed.
ALTER TABLE "election_ballots" ADD COLUMN "voterGroup" "ElectionVoterGroup";
CREATE INDEX "election_ballots_electionId_voterGroup_idx" ON "election_ballots"("electionId", "voterGroup");

CREATE TABLE "election_result_snapshots" (
  "id" UUID NOT NULL,
  "electionId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "ElectionResultStatus" NOT NULL,
  "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "countedByUserId" UUID NOT NULL,
  CONSTRAINT "election_result_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_position_results" (
  "id" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "electionId" UUID NOT NULL,
  "positionId" UUID NOT NULL,
  "positionTitle" TEXT NOT NULL,
  "status" "ElectionPositionResultStatus" NOT NULL,
  "notaFinalScore" DECIMAL(24,18) NOT NULL DEFAULT 0,
  CONSTRAINT "election_position_results_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_position_group_results" (
  "id" UUID NOT NULL,
  "positionResultId" UUID NOT NULL,
  "voterGroup" "ElectionVoterGroup" NOT NULL,
  "eligibleCount" INTEGER NOT NULL,
  "participationCount" INTEGER NOT NULL,
  "abstentionCount" INTEGER NOT NULL,
  "notaVoteCount" INTEGER NOT NULL,
  "scoringDenominator" INTEGER NOT NULL,
  "quorumPercent" DECIMAL(5,2) NOT NULL,
  "quorumMet" BOOLEAN NOT NULL,
  "configuredWeight" DECIMAL(5,2) NOT NULL,
  "notaNormalizedScore" DECIMAL(24,18) NOT NULL DEFAULT 0,
  CONSTRAINT "election_position_group_results_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_candidate_results" (
  "id" UUID NOT NULL,
  "positionResultId" UUID NOT NULL,
  "electionId" UUID NOT NULL,
  "candidateId" UUID NOT NULL,
  "candidateName" TEXT NOT NULL,
  "rawRank" INTEGER NOT NULL,
  "isProvisionalWinner" BOOLEAN NOT NULL DEFAULT false,
  "finalScore" DECIMAL(24,18) NOT NULL,
  CONSTRAINT "election_candidate_results_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "election_candidate_group_results" (
  "id" UUID NOT NULL,
  "candidateResultId" UUID NOT NULL,
  "positionGroupResultId" UUID NOT NULL,
  "rawVoteCount" INTEGER NOT NULL,
  "normalizedScore" DECIMAL(24,18) NOT NULL,
  CONSTRAINT "election_candidate_group_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "election_result_snapshots_electionId_version_key" ON "election_result_snapshots"("electionId", "version");
CREATE INDEX "election_result_snapshots_electionId_countedAt_idx" ON "election_result_snapshots"("electionId", "countedAt");
CREATE UNIQUE INDEX "election_position_results_snapshotId_positionId_key" ON "election_position_results"("snapshotId", "positionId");
CREATE INDEX "election_position_results_electionId_positionId_idx" ON "election_position_results"("electionId", "positionId");
CREATE UNIQUE INDEX "election_position_group_results_positionResultId_voterGroup_key" ON "election_position_group_results"("positionResultId", "voterGroup");
CREATE UNIQUE INDEX "election_candidate_results_positionResultId_candidateId_key" ON "election_candidate_results"("positionResultId", "candidateId");
CREATE INDEX "election_candidate_results_candidateId_idx" ON "election_candidate_results"("candidateId");
CREATE UNIQUE INDEX "election_candidate_group_results_candidateResultId_positionGroupResultId_key" ON "election_candidate_group_results"("candidateResultId", "positionGroupResultId");

ALTER TABLE "election_result_snapshots" ADD CONSTRAINT "election_result_snapshots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_result_snapshots" ADD CONSTRAINT "election_result_snapshots_countedByUserId_fkey" FOREIGN KEY ("countedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_position_results" ADD CONSTRAINT "election_position_results_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "election_result_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_position_results" ADD CONSTRAINT "election_position_results_positionId_electionId_fkey" FOREIGN KEY ("positionId", "electionId") REFERENCES "election_positions"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_position_group_results" ADD CONSTRAINT "election_position_group_results_positionResultId_fkey" FOREIGN KEY ("positionResultId") REFERENCES "election_position_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_candidate_results" ADD CONSTRAINT "election_candidate_results_positionResultId_fkey" FOREIGN KEY ("positionResultId") REFERENCES "election_position_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_candidate_results" ADD CONSTRAINT "election_candidate_results_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_candidate_group_results" ADD CONSTRAINT "election_candidate_group_results_candidateResultId_fkey" FOREIGN KEY ("candidateResultId") REFERENCES "election_candidate_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_candidate_group_results" ADD CONSTRAINT "election_candidate_group_results_positionGroupResultId_fkey" FOREIGN KEY ("positionGroupResultId") REFERENCES "election_position_group_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "election_position_results" ADD CONSTRAINT "election_position_results_score_check" CHECK ("notaFinalScore" >= 0);
ALTER TABLE "election_position_group_results" ADD CONSTRAINT "election_position_group_results_counts_check" CHECK (
  "eligibleCount" >= 0 AND "participationCount" >= 0 AND "participationCount" <= "eligibleCount"
  AND "abstentionCount" >= 0 AND "notaVoteCount" >= 0 AND "scoringDenominator" >= "notaVoteCount"
  AND "quorumPercent" BETWEEN 0 AND 100 AND "configuredWeight" BETWEEN 0 AND 100
  AND "notaNormalizedScore" >= 0
);
ALTER TABLE "election_candidate_results" ADD CONSTRAINT "election_candidate_results_score_check" CHECK ("rawRank" > 0 AND "finalScore" >= 0);
ALTER TABLE "election_candidate_group_results" ADD CONSTRAINT "election_candidate_group_results_score_check" CHECK ("rawVoteCount" >= 0 AND "normalizedScore" >= 0);

-- Results are write-once. The application never exposes delete endpoints and
-- restrictive foreign keys preserve history; this guard rejects score edits.
CREATE FUNCTION "prevent_election_result_update"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Election result snapshots are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "election_result_snapshots_immutable" BEFORE UPDATE ON "election_result_snapshots" FOR EACH ROW EXECUTE FUNCTION "prevent_election_result_update"();
CREATE TRIGGER "election_position_results_immutable" BEFORE UPDATE ON "election_position_results" FOR EACH ROW EXECUTE FUNCTION "prevent_election_result_update"();
CREATE TRIGGER "election_position_group_results_immutable" BEFORE UPDATE ON "election_position_group_results" FOR EACH ROW EXECUTE FUNCTION "prevent_election_result_update"();
CREATE TRIGGER "election_candidate_results_immutable" BEFORE UPDATE ON "election_candidate_results" FOR EACH ROW EXECUTE FUNCTION "prevent_election_result_update"();
CREATE TRIGGER "election_candidate_group_results_immutable" BEFORE UPDATE ON "election_candidate_group_results" FOR EACH ROW EXECUTE FUNCTION "prevent_election_result_update"();
