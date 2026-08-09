import type { Prisma, PrismaClient } from "@prisma/client";
import type { ApplicationStatus } from "@/modules/placements";
import type { PlacementReportFilters } from "../domain/entities";
import type { MyApplicationRow, PlacementFunnelCounts, PlacementReportRepository } from "../application/ports/placement-report-repository";

const FUNNEL_STAGES: readonly ApplicationStatus[] = ["SHORTLISTED", "INTERVIEW", "OFFER", "ACCEPTED"];
const OFFER_OR_BETTER: readonly ApplicationStatus[] = ["OFFER", "ACCEPTED", "ACTIVE", "COMPLETED"];
const PLACED: readonly ApplicationStatus[] = ["ACCEPTED", "ACTIVE", "COMPLETED"];

function applicationWhere(filters: PlacementReportFilters): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = { placementDrive: { type: filters.type } };
  if (filters.batchIds) where.studentProfile = { batchId: { in: [...filters.batchIds] } };
  if (filters.dateFrom || filters.dateTo) {
    where.appliedAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }
  return where;
}

/**
 * V4.0 E7 — see PlacementFunnelReport's own doc comment (domain/entities.ts)
 * for the exact, deliberately-chosen counting methodology per metric. This
 * file is the one place that methodology is actually implemented.
 */
export class PrismaPlacementReportRepository implements PlacementReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getFunnel(filters: PlacementReportFilters): Promise<PlacementFunnelCounts> {
    const where = applicationWhere(filters);

    const [applied, interviewsScheduled, statusGroups, stageEventGroups, offerOrBetterRows] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.count({ where: { ...where, interviewScheduledAt: { not: null } } }),
      this.prisma.application.groupBy({ by: ["currentStatus"], where, _count: { _all: true } }),
      // "Ever reached" each funnel stage — see domain/entities.ts's doc
      // comment for why this must come from the event log, not currentStatus.
      this.prisma.applicationStatusEvent.groupBy({
        by: ["toStatus"],
        where: { toStatus: { in: [...FUNNEL_STAGES] }, application: where },
        _count: { _all: true },
      }),
      // Bounded to offer-or-better applications only (a small subset) —
      // grouping by company name happens in-app on this already-narrowed
      // set, the same "fetch narrowed set, aggregate in memory" tradeoff
      // PrismaRecruiterDirectoryRepository's own doc comment already
      // establishes as this codebase's precedent, rather than a second DB
      // round trip per company (§19 — no N+1).
      this.prisma.application.findMany({
        where: { ...where, currentStatus: { in: [...OFFER_OR_BETTER] } },
        select: { currentStatus: true, placementDrive: { select: { company: { select: { name: true } } } } },
      }),
    ]);

    const countByStage = (status: ApplicationStatus) => stageEventGroups.find((g) => g.toStatus === status)?._count._all ?? 0;

    const companiesMap = new Map<string, { offersCount: number; acceptedCount: number }>();
    for (const row of offerOrBetterRows) {
      const name = row.placementDrive.company.name;
      const entry = companiesMap.get(name) ?? { offersCount: 0, acceptedCount: 0 };
      if (OFFER_OR_BETTER.includes(row.currentStatus)) entry.offersCount += 1;
      if (PLACED.includes(row.currentStatus)) entry.acceptedCount += 1;
      companiesMap.set(name, entry);
    }

    return {
      applied,
      reachedShortlisted: countByStage("SHORTLISTED"),
      reachedInterview: countByStage("INTERVIEW"),
      reachedOffer: countByStage("OFFER"),
      reachedAccepted: countByStage("ACCEPTED"),
      interviewsScheduled,
      currentStatusBreakdown: statusGroups.map((g) => ({ status: g.currentStatus, count: g._count._all })),
      companiesRecruited: [...companiesMap.entries()]
        .map(([companyName, counts]) => ({ companyName, ...counts }))
        .sort((a, b) => b.offersCount - a.offersCount),
    };
  }

  async listMyApplications(studentProfileId: string): Promise<readonly MyApplicationRow[]> {
    const [applications, events] = await Promise.all([
      this.prisma.application.findMany({
        where: { studentProfileId },
        select: {
          id: true,
          currentStatus: true,
          appliedAt: true,
          interviewScheduledAt: true,
          placementDrive: { select: { title: true, type: true, company: { select: { name: true } } } },
        },
        orderBy: { appliedAt: "desc" },
      }),
      // One extra query for this single student's own (typically single-digit) applications — see MyApplicationRow's doc comment.
      this.prisma.applicationStatusEvent.findMany({
        where: { application: { studentProfileId }, toStatus: { in: ["OFFER", "ACCEPTED"] } },
        select: { applicationId: true, toStatus: true },
      }),
    ]);

    const offerApplicationIds = new Set(events.filter((e) => e.toStatus === "OFFER").map((e) => e.applicationId));
    const acceptedApplicationIds = new Set(events.filter((e) => e.toStatus === "ACCEPTED").map((e) => e.applicationId));

    return applications.map((a) => ({
      applicationId: a.id,
      companyName: a.placementDrive.company.name,
      title: a.placementDrive.title,
      type: a.placementDrive.type,
      currentStatus: a.currentStatus,
      appliedAt: a.appliedAt,
      interviewScheduledAt: a.interviewScheduledAt,
      everReceivedOffer: offerApplicationIds.has(a.id),
      everAccepted: acceptedApplicationIds.has(a.id),
    }));
  }
}
