import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentDriveDTO } from "../../domain/entities";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";
import type { ApplicationRepository } from "../ports/application-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";

/**
 * V4.0 D1 (§7 step 8) — the career hub's "open drives" list. An empty
 * `eligibleBatchIds` on a drive means open to every batch (no restriction),
 * mirroring how an omitted filter means "no restriction" everywhere else in
 * this codebase.
 */
export class ListOpenDrivesForStudentUseCase {
  constructor(
    private readonly deps: {
      placementDriveRepository: PlacementDriveRepository;
      applicationRepository: ApplicationRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
    },
  ) {}

  async execute(actor: AuthenticatedActor): Promise<StudentDriveDTO[]> {
    if (actor.role !== "STUDENT" || !actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to view placement drives");
    }

    const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(actor.studentProfileId);
    if (!student) return [];

    const [announced, inProgress] = await Promise.all([
      this.deps.placementDriveRepository.search({ status: "ANNOUNCED" }),
      this.deps.placementDriveRepository.search({ status: "IN_PROGRESS" }),
    ]);

    const now = new Date();
    const visible = [...announced, ...inProgress].filter((drive) => {
      const openToAllBatches = drive.eligibility.eligibleBatchIds.length === 0;
      const eligibleByBatch = openToAllBatches || drive.eligibility.eligibleBatchIds.includes(student.batchId);
      const deadlineNotPassed = !drive.applicationDeadline || drive.applicationDeadline >= now;
      return eligibleByBatch && deadlineNotPassed;
    });

    const applications = await Promise.all(
      visible.map((drive) => this.deps.applicationRepository.findByStudentAndDrive(actor.studentProfileId!, drive.id)),
    );

    return visible.map((drive, index) => ({
      driveId: drive.id,
      companyName: drive.companyName,
      title: drive.title,
      type: drive.type,
      packageOrStipend: drive.packageOrStipend,
      description: drive.description,
      applicationDeadline: drive.applicationDeadline,
      hasApplied: applications[index] !== null,
      applicationStatus: applications[index]?.currentStatus ?? null,
    }));
  }
}
