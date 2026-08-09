import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PlacementFunnelReport, PlacementReportFilters } from "../../domain/entities";
import type { PlacementReportRepository } from "../ports/placement-report-repository";
import { resolveInstitutionalReportScope } from "../authorize-report-scope";

export interface GetPlacementFunnelReportInput {
  readonly actor: AuthenticatedActor;
  readonly filters: PlacementReportFilters;
}

/**
 * V4.0 E7 (PRD §16) — the Placements/Internships institutional report
 * (same aggregation, `filters.type` selects which). Secretary/Coordinator
 * only — Student/Recruiter "own data" access is a completely separate use
 * case (GetMyPlacementActivityUseCase / GetMyRecruitingActivityUseCase),
 * never this one, matching §4's "Reports: Coordinator Scoped, Secretary
 * Full, Student/Recruiter Own data only" distinction precisely.
 */
export class GetPlacementFunnelReportUseCase {
  constructor(private readonly deps: { repository: PlacementReportRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: GetPlacementFunnelReportInput): Promise<PlacementFunnelReport> {
    const scope = resolveInstitutionalReportScope(input.actor);
    if (!scope) throw new NotAuthorizedError("Not authorized to view institutional reports");

    // A Coordinator's batch filter is intersected with their own scope,
    // never trusted verbatim from the request — the same "never let a
    // scoped actor request an out-of-scope batch" rule
    // SearchStudentsUseCase already enforces.
    const effectiveBatchIds = scope.batchIds
      ? (input.filters.batchIds ?? scope.batchIds).filter((id) => scope.batchIds!.includes(id))
      : input.filters.batchIds;

    const effectiveFilters: PlacementReportFilters = { ...input.filters, batchIds: effectiveBatchIds };
    const counts = await this.deps.repository.getFunnel(effectiveFilters);

    // targetEntityId is a strict UUID column (AuditLog.targetEntityId) —
    // there is no single UUID entity a whole-report generation targets, so
    // this uses the actor's own userId, the same convention every other
    // "no specific target" audit call in this codebase already uses (e.g.
    // LoginUseCase, UploadAvatarUseCase) — the actual report identity
    // (type/batch scope) lives in metadata instead.
    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REPORT_GENERATED,
      targetEntityType: "Report",
      targetEntityId: input.actor.userId,
      metadata: { report: "placement-funnel", type: effectiveFilters.type, batchIds: effectiveBatchIds ?? null },
    });

    return {
      type: effectiveFilters.type,
      applied: counts.applied,
      reachedShortlisted: counts.reachedShortlisted,
      reachedInterview: counts.reachedInterview,
      reachedOffer: counts.reachedOffer,
      reachedAccepted: counts.reachedAccepted,
      placed: counts.reachedAccepted,
      interviewsScheduled: counts.interviewsScheduled,
      currentStatusBreakdown: counts.currentStatusBreakdown,
      companiesRecruited: counts.companiesRecruited,
      filters: effectiveFilters,
    };
  }
}
