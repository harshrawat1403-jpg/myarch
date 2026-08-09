/**
 * Public exports of the placements module (V4.0 D1). Other modules must
 * import only from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  PlacementDriveType,
  PlacementDriveStatus,
  ApplicationStatus,
  InterviewMode,
  DriveEligibility,
  PlacementDriveRecord,
  PlacementDriveSearchFilters,
  ApplicationRecord,
  ApplicationStatusEventRecord,
  StudentDriveDTO,
  StudentApplicationDTO,
  DriveApplicationDTO,
  InternshipOutcomeRecord,
} from "./domain/entities";
export { TERMINAL_APPLICATION_STATUSES } from "./domain/entities";
export {
  PlacementDriveNotFoundError,
  DriveNotDraftError,
  InvalidDriveStatusTransitionError,
  DriveNotOpenError,
  NotEligibleForDriveError,
  AlreadyAppliedError,
  ApplicationNotFoundError,
  InvalidApplicationStatusTransitionError,
  InterviewNotSchedulableError,
  InternshipOutcomeNotFoundError,
  InvalidCertificateFileError,
} from "./domain/errors";

export { createPlacementDriveRouteHandler } from "./presentation/route-handlers/create-drive";
export { updatePlacementDriveRouteHandler } from "./presentation/route-handlers/update-drive";
export { publishPlacementDriveRouteHandler } from "./presentation/route-handlers/publish-drive";
export { setPlacementDriveStatusRouteHandler } from "./presentation/route-handlers/set-drive-status";
export { searchPlacementDrivesRouteHandler } from "./presentation/route-handlers/search-drives";
export { getPlacementDriveRouteHandler } from "./presentation/route-handlers/get-drive";
export { searchApplicationsForDriveRouteHandler } from "./presentation/route-handlers/search-applications-for-drive";
export { getApplicationRouteHandler } from "./presentation/route-handlers/get-application";
export { updateApplicationStatusRouteHandler } from "./presentation/route-handlers/update-application-status";
export { listOpenDrivesForStudentRouteHandler } from "./presentation/route-handlers/list-open-drives";
export { applyToPlacementDriveRouteHandler } from "./presentation/route-handlers/apply-to-drive";
export { withdrawApplicationRouteHandler } from "./presentation/route-handlers/withdraw-application";
export { listMyApplicationsRouteHandler } from "./presentation/route-handlers/list-my-applications";
export { scheduleInterviewRouteHandler } from "./presentation/route-handlers/schedule-interview";
export { getInternshipOutcomeRouteHandler } from "./presentation/route-handlers/get-internship-outcome";
export { updateInternshipOutcomeRouteHandler } from "./presentation/route-handlers/update-internship-outcome";
export { submitStudentFeedbackRouteHandler } from "./presentation/route-handlers/submit-student-feedback";
export { uploadCertificateRouteHandler } from "./presentation/route-handlers/upload-certificate";
export { getCertificateRouteHandler } from "./presentation/route-handlers/get-certificate";
