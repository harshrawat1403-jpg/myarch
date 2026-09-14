-- The permanent Core selection delete workflow is the only authorized escape
-- hatch from the immutable finalized decision/publication/appointment records.
CREATE OR REPLACE FUNCTION phase6_prevent_final_core_selection_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND COALESCE(current_setting('myarch.allow_core_publication_delete', true), 'off') = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Final Phase 6 Core Committee selection records are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS core_selection_finalized_decision_immutable ON "core_committee_selection_decisions";
CREATE TRIGGER core_selection_finalized_decision_immutable
  BEFORE UPDATE OR DELETE ON "core_committee_selection_decisions"
  FOR EACH ROW WHEN (OLD."state" = 'FINALIZED')
  EXECUTE FUNCTION phase6_prevent_final_core_selection_mutation();

DROP TRIGGER IF EXISTS core_selection_publication_immutable ON "core_committee_selection_publications";
CREATE TRIGGER core_selection_publication_immutable
  BEFORE UPDATE OR DELETE ON "core_committee_selection_publications"
  FOR EACH ROW EXECUTE FUNCTION phase6_prevent_final_core_selection_mutation();

DROP TRIGGER IF EXISTS core_selection_appointment_immutable ON "core_committee_selection_appointments";
CREATE TRIGGER core_selection_appointment_immutable
  BEFORE UPDATE OR DELETE ON "core_committee_selection_appointments"
  FOR EACH ROW EXECUTE FUNCTION phase6_prevent_final_core_selection_mutation();