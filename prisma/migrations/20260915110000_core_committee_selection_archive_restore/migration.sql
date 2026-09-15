-- Preserve the prior lifecycle state when a selection is archived so restore
-- can resume it without reopening an expired application window.
ALTER TABLE "core_committee_selections"
ADD COLUMN "statusBeforeArchive" "CoreCommitteeSelectionStatus";
