import type {
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStatusEventRecord,
  InterviewMode,
} from "../../domain/entities";

export interface ApplicationRepository {
  create(studentProfileId: string, placementDriveId: string): Promise<ApplicationRecord>;
  findById(id: string): Promise<ApplicationRecord | null>;
  findByStudentAndDrive(studentProfileId: string, placementDriveId: string): Promise<ApplicationRecord | null>;
  listForStudent(studentProfileId: string): Promise<ApplicationRecord[]>;
  listForDrive(placementDriveId: string): Promise<ApplicationRecord[]>;
  /** V4.0 D3 — sets (or reschedules) the interview date/time/mode; independent of currentStatus's own transition rules. */
  scheduleInterview(applicationId: string, scheduledAt: Date, mode: InterviewMode): Promise<ApplicationRecord>;
  /**
   * Atomically updates Application.currentStatus and appends the
   * corresponding ApplicationStatusEvent row. `fromStatus` is supplied by
   * the caller (which already read the application to validate the
   * transition) rather than re-read here, so this method never has to
   * choose between a second query and a race-prone assumption.
   */
  transitionStatus(
    applicationId: string,
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
    changedByUserId: string,
    note: string | null,
  ): Promise<ApplicationRecord>;
  listStatusEvents(applicationId: string): Promise<ApplicationStatusEventRecord[]>;
}
