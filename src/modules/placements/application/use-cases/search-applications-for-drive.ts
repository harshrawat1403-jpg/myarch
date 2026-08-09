import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { DriveApplicationDTO } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import { PlacementDriveNotFoundError } from "../../domain/errors";

export interface SearchApplicationsForDriveInput {
  actor: AuthenticatedActor;
  driveId: string;
}

/** V4.0 D1/D3 — every application against one drive, joined with the applying student's name/batch for the Secretary/Coordinator application board (§14). A Coordinator sees only applications from students within their own batch scope, even though they may be able to see the drive's own metadata (a drive can span multiple batches). */
export class SearchApplicationsForDriveUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      placementDriveRepository: PlacementDriveRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
    },
  ) {}

  async execute(input: SearchApplicationsForDriveInput): Promise<DriveApplicationDTO[]> {
    if (input.actor.role !== "SECRETARY" && input.actor.role !== "COORDINATOR") {
      throw new NotAuthorizedError("Not authorized to view drive applications");
    }

    const drive = await this.deps.placementDriveRepository.findById(input.driveId);
    if (!drive) throw new PlacementDriveNotFoundError();

    const applications = await this.deps.applicationRepository.listForDrive(input.driveId);
    const students = await Promise.all(
      applications.map((a) => this.deps.studentEligibilityLookup.findByStudentProfileId(a.studentProfileId)),
    );

    const scope = input.actor.role === "COORDINATOR" ? (input.actor.batchScope ?? []) : null;

    const result: DriveApplicationDTO[] = [];
    for (let i = 0; i < applications.length; i++) {
      const application = applications[i]!;
      const student = students[i];
      if (!student) continue;
      if (scope && !scope.includes(student.batchId)) continue;

      result.push({
        applicationId: application.id,
        studentProfileId: application.studentProfileId,
        studentName: student.fullName,
        batchName: student.batchName,
        currentStatus: application.currentStatus,
        currentRound: application.currentRound,
        interviewScheduledAt: application.interviewScheduledAt,
        interviewMode: application.interviewMode,
        appliedAt: application.appliedAt,
      });
    }
    return result;
  }
}
