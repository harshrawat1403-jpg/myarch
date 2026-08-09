import type { AuthenticatedActor } from "@/modules/auth";
import { canManageAlumni } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { AlumniReport, AlumniReportFilters } from "../../domain/entities";
import type { AlumniReportRepository } from "../ports/alumni-report-repository";

export interface GetAlumniReportInput {
  readonly actor: AuthenticatedActor;
  readonly filters: AlumniReportFilters;
}

/** V4.0 E7 (PRD §16 — "New report types: ... Alumni"). Secretary/Coordinator, full/unscoped — mirrors canManageAlumni exactly (alumni aren't tied to a batch a Coordinator manages, same reasoning as the Alumni CRUD module itself). */
export class GetAlumniReportUseCase {
  constructor(private readonly deps: { repository: AlumniReportRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: GetAlumniReportInput): Promise<AlumniReport> {
    if (!canManageAlumni(input.actor)) throw new NotAuthorizedError("Not authorized to view this report");

    const counts = await this.deps.repository.getSummary(input.filters);

    // targetEntityId is a strict UUID column — see GetPlacementFunnelReportUseCase's identical doc comment for why this uses the actor's own userId.
    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REPORT_GENERATED,
      targetEntityType: "Report",
      targetEntityId: input.actor.userId,
      metadata: { report: "alumni", filters: input.filters },
    });

    return { ...counts, filters: input.filters };
  }
}
