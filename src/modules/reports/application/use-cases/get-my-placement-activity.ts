import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { MyPlacementActivityReport } from "../../domain/entities";
import type { PlacementReportRepository } from "../ports/placement-report-repository";

/** V4.0 E7 (PRD §4 — Student Reports: "Own data only") — a student's own applications, never another student's. */
export class GetMyPlacementActivityUseCase {
  constructor(private readonly deps: { repository: PlacementReportRepository }) {}

  async execute(actor: AuthenticatedActor): Promise<MyPlacementActivityReport> {
    if (actor.role !== "STUDENT" || !actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to view this report");
    }

    const applications = await this.deps.repository.listMyApplications(actor.studentProfileId);

    return {
      totalApplications: applications.length,
      interviewsScheduled: applications.filter((a) => a.interviewScheduledAt !== null).length,
      offersReceived: applications.filter((a) => a.everReceivedOffer).length,
      placed: applications.some((a) => a.everAccepted),
      applications: applications.map((a) => ({
        applicationId: a.applicationId,
        companyName: a.companyName,
        title: a.title,
        type: a.type,
        currentStatus: a.currentStatus,
        appliedAt: a.appliedAt,
      })),
    };
  }
}
