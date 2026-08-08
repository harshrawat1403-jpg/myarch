/**
 * Deliberately distinct from students'/profiles' error classes (not
 * imported from those modules) — this module is isolated from the internal
 * administration system, including its error vocabulary.
 */
export class ApprovedProfileNotFoundError extends Error {
  constructor() {
    super("No approved profile is available for this student");
    this.name = "ApprovedProfileNotFoundError";
  }
}

export class ResumeNotAvailableError extends Error {
  constructor() {
    super("This student has not made a resume available");
    this.name = "ResumeNotAvailableError";
  }
}

// V3.0 Administration Platform — admin-side recruiter account management errors.

export class RecruiterAccountNotFoundError extends Error {
  constructor() {
    super("Recruiter not found");
    this.name = "RecruiterAccountNotFoundError";
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account with email "${email}" already exists`);
    this.name = "DuplicateEmailError";
  }
}

export class RecruiterAlreadyActiveError extends Error {
  constructor() {
    super("Recruiter is already active");
    this.name = "RecruiterAlreadyActiveError";
  }
}

export class RecruiterAlreadyDisabledError extends Error {
  constructor() {
    super("Recruiter is already disabled");
    this.name = "RecruiterAlreadyDisabledError";
  }
}

/** ApproveRecruiterUseCase/RejectRecruiterUseCase only operate on a PENDING account — see the RecruiterApprovalStatus doc comment for why Secretary-created accounts never reach either. */
export class RecruiterNotPendingError extends Error {
  constructor() {
    super("This recruiter account is not pending approval");
    this.name = "RecruiterNotPendingError";
  }
}
