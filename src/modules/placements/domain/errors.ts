export class PlacementDriveNotFoundError extends Error {
  constructor() {
    super("Placement drive not found");
    this.name = "PlacementDriveNotFoundError";
  }
}

/** PublishPlacementDriveUseCase only operates on a DRAFT drive. */
export class DriveNotDraftError extends Error {
  constructor() {
    super("Only a draft drive can be published");
    this.name = "DriveNotDraftError";
  }
}

export class InvalidDriveStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move a drive from ${from} to ${to}`);
    this.name = "InvalidDriveStatusTransitionError";
  }
}

/** ApplyToPlacementDriveUseCase — the drive is not currently accepting applications (not ANNOUNCED/IN_PROGRESS, or past its deadline). */
export class DriveNotOpenError extends Error {
  constructor() {
    super("This drive is not currently open for applications");
    this.name = "DriveNotOpenError";
  }
}

export class NotEligibleForDriveError extends Error {
  constructor(reason: string) {
    super(`Not eligible for this drive: ${reason}`);
    this.name = "NotEligibleForDriveError";
  }
}

export class AlreadyAppliedError extends Error {
  constructor() {
    super("You have already applied to this drive");
    this.name = "AlreadyAppliedError";
  }
}

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("Application not found");
    this.name = "ApplicationNotFoundError";
  }
}

export class InvalidApplicationStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move an application from ${from} to ${to}`);
    this.name = "InvalidApplicationStatusTransitionError";
  }
}

/** ScheduleInterviewUseCase — an application already in a terminal state (REJECTED/COMPLETED/WITHDRAWN) has nothing left to schedule. */
export class InterviewNotSchedulableError extends Error {
  constructor(status: string) {
    super(`Cannot schedule an interview for an application that is already ${status}`);
    this.name = "InterviewNotSchedulableError";
  }
}

/** V4.0 D4 — no InternshipOutcome exists yet for this application (it is only created once the application reaches ACTIVE on an INTERNSHIP drive). */
export class InternshipOutcomeNotFoundError extends Error {
  constructor() {
    super("No internship outcome exists for this application yet");
    this.name = "InternshipOutcomeNotFoundError";
  }
}

/** V4.0 D4 — the certificate upload rejected the given file (wrong type or too large). */
export class InvalidCertificateFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCertificateFileError";
  }
}
