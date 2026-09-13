-- Keep Core publication records immutable except while the authorized,
-- transaction-scoped permanent-selection delete workflow is running.
CREATE OR REPLACE FUNCTION core_committee_selection_publication_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND COALESCE(current_setting('myarch.allow_core_publication_delete', true), 'off') = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Final Phase 6 Core Committee selection records are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS core_selection_publication_immutable ON "core_committee_selection_publications";
CREATE TRIGGER core_selection_publication_immutable
  BEFORE UPDATE OR DELETE ON "core_committee_selection_publications"
  FOR EACH ROW EXECUTE FUNCTION core_committee_selection_publication_immutable();
