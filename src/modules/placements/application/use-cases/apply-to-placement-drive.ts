import type { AuthenticatedActor } from "@/modules/auth";
import { canApplyToPlacementDrive } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ApplicationRecord } from "../../domain/entities";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";
import type { ApplicationRepository } from "../ports/application-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import { isDriveOpenForApplications } from "../../domain/drive-lifecycle";
import {
  AlreadyAppliedError,
  DriveNotOpenError,
  NotEligibleForDriveError,
  PlacementDriveNotFoundError,
} from "../../domain/errors";

export interface ApplyToPlacementDriveInput {
  actor: AuthenticatedActor;
  driveId: string;
}

/** V4.0 D1 (§7 step 8) — a student applying to an open drive. Not idempotent like Express Interest: a second attempt is a genuine error (AlreadyAppliedError), since re-applying isn't a "just re-show the state" action the way expressing interest again is. */
export class ApplyToPlacementDriveUseCase {
  constructor(
    private readonly deps: {
      placementDriveRepository: PlacementDriveRepository;
      applicationRepository: ApplicationRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
    },
  ) {}

  async execute(input: ApplyToPlacementDriveInput): Promise<ApplicationRecord> {
    if (!canApplyToPlacementDrive(input.actor) || !input.actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to apply to placement drives");
    }

    const drive = await this.deps.placementDriveRepository.findById(input.driveId);
    if (!drive) throw new PlacementDriveNotFoundError();

    const now = new Date();
    const deadlinePassed = Boolean(drive.applicationDeadline && drive.applicationDeadline < now);
    if (!isDriveOpenForApplications(drive.status) || deadlinePassed) {
      throw new DriveNotOpenError();
    }

    const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(input.actor.studentProfileId);
    if (!student) throw new NotEligibleForDriveError("student profile not found");

    const { eligibleBatchIds, minCgpa, backlogAllowance } = drive.eligibility;
    if (eligibleBatchIds.length > 0 && !eligibleBatchIds.includes(student.batchId)) {
      throw new NotEligibleForDriveError("your batch is not eligible for this drive");
    }
    if (minCgpa !== undefined && (student.cgpa === null || student.cgpa < minCgpa)) {
      throw new NotEligibleForDriveError(`a minimum CGPA of ${minCgpa} is required`);
    }
    if (backlogAllowance === false && student.hasActiveBacklog) {
      throw new NotEligibleForDriveError("students with an active backlog are not eligible for this drive");
    }

    const existing = await this.deps.applicationRepository.findByStudentAndDrive(
      input.actor.studentProfileId,
      input.driveId,
    );
    if (existing) throw new AlreadyAppliedError();

    return this.deps.applicationRepository.create(input.actor.studentProfileId, input.driveId);
  }
}
