CREATE TABLE "core_committee_selection_publications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "selectionId" UUID NOT NULL,
  "publishedByUserId" UUID NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "core_committee_selection_publications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "core_committee_selection_publications_selectionId_key" UNIQUE ("selectionId"),
  CONSTRAINT "core_committee_selection_publications_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "core_committee_selection_publications_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "core_committee_selection_appointments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "selectionId" UUID NOT NULL,
  "decisionId" UUID NOT NULL,
  "candidateId" UUID NOT NULL,
  "positionId" UUID NOT NULL,
  "committeeId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "appointedUserId" UUID NOT NULL,
  "confirmedByUserId" UUID NOT NULL,
  "appointedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "core_committee_selection_appointments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "core_committee_selection_appointments_decisionId_key" UNIQUE ("decisionId"),
  CONSTRAINT "core_committee_selection_appointments_membershipId_key" UNIQUE ("membershipId"),
  CONSTRAINT "core_committee_selection_appointments_selectionId_candidateId_positionId_key" UNIQUE ("selectionId", "candidateId", "positionId"),
  CONSTRAINT "core_committee_selection_appointments_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "core_committee_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "core_committee_selection_appointments_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "core_committee_selection_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "core_committee_selection_appointments_candidateId_selectionId_fkey" FOREIGN KEY ("candidateId", "selectionId") REFERENCES "core_committee_selection_candidates"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "core_committee_selection_appointments_positionId_selectionId_fkey" FOREIGN KEY ("positionId", "selectionId") REFERENCES "core_committee_selection_positions"("id", "selectionId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "core_committee_selection_appointments_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "core_committee_selection_appointments_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "committee_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "core_committee_selection_appointments_appointedUserId_fkey" FOREIGN KEY ("appointedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "core_committee_selection_appointments_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "core_committee_selection_appointments_committeeId_idx" ON "core_committee_selection_appointments"("committeeId");
CREATE UNIQUE INDEX "core_committee_active_membership_position_key" ON "committee_memberships"("committeeId", "userId", "position") WHERE "isActive" AND "position" IS NOT NULL;

CREATE OR REPLACE FUNCTION phase6_prevent_final_core_selection_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Final Phase 6 Core Committee selection records are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER core_selection_finalized_decision_immutable BEFORE UPDATE OR DELETE ON "core_committee_selection_decisions" FOR EACH ROW WHEN (OLD."state" = 'FINALIZED') EXECUTE FUNCTION phase6_prevent_final_core_selection_mutation();
CREATE TRIGGER core_selection_publication_immutable BEFORE UPDATE OR DELETE ON "core_committee_selection_publications" FOR EACH ROW EXECUTE FUNCTION phase6_prevent_final_core_selection_mutation();
CREATE TRIGGER core_selection_appointment_immutable BEFORE UPDATE OR DELETE ON "core_committee_selection_appointments" FOR EACH ROW EXECUTE FUNCTION phase6_prevent_final_core_selection_mutation();
