import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentApplicationDTO } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";

/** V4.0 D1 — /student/applications (built in D2). Own applications only, joined with the drive's display fields. */
export class ListMyApplicationsUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      placementDriveRepository: PlacementDriveRepository;
    },
  ) {}

  async execute(actor: AuthenticatedActor): Promise<StudentApplicationDTO[]> {
    if (actor.role !== "STUDENT" || !actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to view applications");
    }

    const applications = await this.deps.applicationRepository.listForStudent(actor.studentProfileId);
    if (applications.length === 0) return [];

    const drives = await Promise.all(
      applications.map((application) => this.deps.placementDriveRepository.findById(application.placementDriveId)),
    );

    const result: StudentApplicationDTO[] = [];
    for (let i = 0; i < applications.length; i++) {
      const application = applications[i]!;
      const drive = drives[i];
      if (!drive) continue;
      result.push({
        applicationId: application.id,
        driveId: drive.id,
        companyName: drive.companyName,
        title: drive.title,
        type: drive.type,
        currentStatus: application.currentStatus,
        interviewScheduledAt: application.interviewScheduledAt,
        interviewMode: application.interviewMode,
        appliedAt: application.appliedAt,
      });
    }
    return result;
  }
}
