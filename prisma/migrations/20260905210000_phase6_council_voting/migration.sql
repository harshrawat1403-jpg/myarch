-- CreateEnum
CREATE TYPE "ElectionParticipationStatus" AS ENUM ('CAST', 'ABSTAINED');

-- AlterEnum

-- AlterTable
ALTER TABLE "elections" ADD COLUMN     "notaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voterSnapshotLockedAt" TIMESTAMP(3),
ADD COLUMN     "voterSnapshotLockedByUserId" UUID,
ADD COLUMN     "votingCloseAt" TIMESTAMP(3),
ADD COLUMN     "votingOpenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "election_faculty_roster_entries" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_faculty_roster_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_ex_council_roster_entries" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_ex_council_roster_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_voter_snapshots" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "voterGroup" "ElectionVoterGroup" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_voter_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_voter_participations" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ElectionParticipationStatus" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_voter_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_ballots" (
    "id" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_ballot_choices" (
    "id" UUID NOT NULL,
    "ballotId" UUID NOT NULL,
    "electionId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "candidateId" UUID,
    "isNota" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "election_ballot_choices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "election_faculty_roster_entries_userId_idx" ON "election_faculty_roster_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "election_faculty_roster_entries_electionId_userId_key" ON "election_faculty_roster_entries"("electionId", "userId");

-- CreateIndex
CREATE INDEX "election_ex_council_roster_entries_userId_idx" ON "election_ex_council_roster_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "election_ex_council_roster_entries_electionId_userId_key" ON "election_ex_council_roster_entries"("electionId", "userId");

-- CreateIndex
CREATE INDEX "election_voter_snapshots_electionId_voterGroup_idx" ON "election_voter_snapshots"("electionId", "voterGroup");

-- CreateIndex
CREATE UNIQUE INDEX "election_voter_snapshots_electionId_userId_key" ON "election_voter_snapshots"("electionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "election_voter_snapshots_id_electionId_key" ON "election_voter_snapshots"("id", "electionId");

-- CreateIndex
CREATE INDEX "election_voter_participations_electionId_status_idx" ON "election_voter_participations"("electionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "election_voter_participations_electionId_userId_key" ON "election_voter_participations"("electionId", "userId");

-- CreateIndex
CREATE INDEX "election_ballots_electionId_castAt_idx" ON "election_ballots"("electionId", "castAt");

-- CreateIndex
CREATE UNIQUE INDEX "election_ballots_id_electionId_key" ON "election_ballots"("id", "electionId");

-- CreateIndex
CREATE INDEX "election_ballot_choices_electionId_positionId_idx" ON "election_ballot_choices"("electionId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "election_ballot_choices_ballotId_positionId_key" ON "election_ballot_choices"("ballotId", "positionId");

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_voterSnapshotLockedByUserId_fkey" FOREIGN KEY ("voterSnapshotLockedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_faculty_roster_entries" ADD CONSTRAINT "election_faculty_roster_entries_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_faculty_roster_entries" ADD CONSTRAINT "election_faculty_roster_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_ex_council_roster_entries" ADD CONSTRAINT "election_ex_council_roster_entries_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_ex_council_roster_entries" ADD CONSTRAINT "election_ex_council_roster_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_voter_snapshots" ADD CONSTRAINT "election_voter_snapshots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_voter_snapshots" ADD CONSTRAINT "election_voter_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_voter_participations" ADD CONSTRAINT "election_voter_participations_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_voter_participations" ADD CONSTRAINT "election_voter_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_ballots" ADD CONSTRAINT "election_ballots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_ballot_choices" ADD CONSTRAINT "election_ballot_choices_ballotId_electionId_fkey" FOREIGN KEY ("ballotId", "electionId") REFERENCES "election_ballots"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_ballot_choices" ADD CONSTRAINT "election_ballot_choices_positionId_electionId_fkey" FOREIGN KEY ("positionId", "electionId") REFERENCES "election_positions"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_ballot_choices" ADD CONSTRAINT "election_ballot_choices_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Prisma cannot express the secrecy and lifecycle checks below in the schema DSL.
ALTER TABLE "elections" ADD CONSTRAINT "elections_voting_window_check"
  CHECK (("votingOpenAt" IS NULL AND "votingCloseAt" IS NULL) OR ("votingOpenAt" < "votingCloseAt"));
ALTER TABLE "elections" ADD CONSTRAINT "elections_voter_snapshot_lock_metadata_check"
  CHECK (("voterSnapshotLockedAt" IS NULL AND "voterSnapshotLockedByUserId" IS NULL) OR ("voterSnapshotLockedAt" IS NOT NULL AND "voterSnapshotLockedByUserId" IS NOT NULL));
ALTER TABLE "elections" ADD CONSTRAINT "elections_voting_snapshot_check"
  CHECK ("status" <> 'VOTING' OR ("votingOpenAt" IS NOT NULL AND "votingCloseAt" IS NOT NULL AND "voterSnapshotLockedAt" IS NOT NULL));
ALTER TABLE "election_ballot_choices" ADD CONSTRAINT "election_ballot_choices_candidate_or_nota_check"
  CHECK (("candidateId" IS NULL AND "isNota" = true) OR ("candidateId" IS NOT NULL AND "isNota" = false));
