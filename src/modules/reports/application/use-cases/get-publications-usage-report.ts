import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PublicationsUsageReport, PublicationsUsageReportFilters } from "../../domain/entities";
import type { PublicationsReportRepository } from "../ports/publications-report-repository";

export interface GetPublicationsUsageReportInput {
  readonly actor: AuthenticatedActor;
  readonly filters: PublicationsUsageReportFilters;
}

/** V4.0 E7 (PRD §16 — "New report types: ... Publications usage"). Secretary/Coordinator, full/unscoped — mirrors canManagePublications exactly (Publication Studio itself is full-access for both, unscoped — §13). */
export class GetPublicationsUsageReportUseCase {
  constructor(private readonly deps: { repository: PublicationsReportRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: GetPublicationsUsageReportInput): Promise<PublicationsUsageReport> {
    if (!canManagePublications(input.actor)) throw new NotAuthorizedError("Not authorized to view this report");

    const counts = await this.deps.repository.getSummary(input.filters);

    // targetEntityId is a strict UUID column — see GetPlacementFunnelReportUseCase's identical doc comment for why this uses the actor's own userId.
    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REPORT_GENERATED,
      targetEntityType: "Report",
      targetEntityId: input.actor.userId,
      metadata: { report: "publications-usage", filters: input.filters },
    });

    return { ...counts, filters: input.filters };
  }
}
