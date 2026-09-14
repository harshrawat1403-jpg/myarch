CREATE TABLE "core_committee_selection_questions" (
    "id" UUID NOT NULL,
    "selectionId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "validation" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "core_committee_selection_questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "core_committee_selection_questions_positionId_key_key"
  ON "core_committee_selection_questions"("positionId", "key");
CREATE UNIQUE INDEX "core_committee_selection_questions_id_selectionId_key"
  ON "core_committee_selection_questions"("id", "selectionId");
CREATE INDEX "core_committee_selection_questions_selectionId_positionId_displayOrder_idx"
  ON "core_committee_selection_questions"("selectionId", "positionId", "displayOrder");

ALTER TABLE "core_committee_selection_questions"
  ADD CONSTRAINT "core_committee_selection_questions_selectionId_fkey"
  FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core_committee_selection_questions"
  ADD CONSTRAINT "core_committee_selection_questions_positionId_selectionId_fkey"
  FOREIGN KEY ("positionId", "selectionId")
  REFERENCES "core_committee_selection_positions"("id", "selectionId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
