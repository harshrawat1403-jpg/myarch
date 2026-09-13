-- Core Committee remains a Council-led selection workflow. These additions
-- support selection-owned intake, rich domain briefs, deadline history, and
-- confidential interview scheduling history without changing Council elections
-- or the standalone Forms/Application schema.
ALTER TABLE "core_committee_selections"
  ADD COLUMN "brief" TEXT NOT NULL DEFAULT '';

ALTER TABLE "core_committee_selection_application_forms"
  ADD COLUMN "managedForm" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "core_committee_selection_interviews"
  ADD COLUMN "candidateInstructions" TEXT,
  ADD COLUMN "internalNotes" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledByUserId" UUID,
  ADD COLUMN "cancellationReason" TEXT;

ALTER TABLE "core_committee_selection_interviews"
  ADD CONSTRAINT "core_committee_selection_interviews_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "core_committee_selection_deadline_extensions" (
  "id" UUID NOT NULL,
  "selectionId" UUID NOT NULL,
  "previousClosingDate" TIMESTAMP(3) NOT NULL,
  "newClosingDate" TIMESTAMP(3) NOT NULL,
  "extendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "extendedByUserId" UUID NOT NULL,
  CONSTRAINT "core_committee_selection_deadline_extensions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "core_committee_selection_deadline_extensions_selectionId_extendedAt_idx"
  ON "core_committee_selection_deadline_extensions"("selectionId", "extendedAt");

ALTER TABLE "core_committee_selection_deadline_extensions"
  ADD CONSTRAINT "core_committee_selection_deadline_extensions_selectionId_fkey"
  FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_committee_selection_deadline_extensions"
  ADD CONSTRAINT "core_committee_selection_deadline_extensions_extendedByUserId_fkey"
  FOREIGN KEY ("extendedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "core_committee_selection_interview_history" (
  "id" UUID NOT NULL,
  "interviewId" UUID NOT NULL,
  "selectionId" UUID NOT NULL,
  "previousScheduledAt" TIMESTAMP(3),
  "newScheduledAt" TIMESTAMP(3),
  "previousDurationMinutes" INTEGER,
  "newDurationMinutes" INTEGER,
  "previousMode" TEXT,
  "newMode" TEXT,
  "previousLocation" TEXT,
  "newLocation" TEXT,
  "previousStatus" "CoreCommitteeSelectionInterviewStatus" NOT NULL,
  "newStatus" "CoreCommitteeSelectionInterviewStatus" NOT NULL,
  "changedByUserId" UUID NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "core_committee_selection_interview_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "core_committee_selection_interview_history_selectionId_changedAt_idx"
  ON "core_committee_selection_interview_history"("selectionId", "changedAt");
CREATE INDEX "core_committee_selection_interview_history_interviewId_changedAt_idx"
  ON "core_committee_selection_interview_history"("interviewId", "changedAt");

ALTER TABLE "core_committee_selection_interview_history"
  ADD CONSTRAINT "core_committee_selection_interview_history_interviewId_fkey"
  FOREIGN KEY ("interviewId") REFERENCES "core_committee_selection_interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_committee_selection_interview_history"
  ADD CONSTRAINT "core_committee_selection_interview_history_selectionId_fkey"
  FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_committee_selection_interview_history"
  ADD CONSTRAINT "core_committee_selection_interview_history_changedByUserId_fkey"
  FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
