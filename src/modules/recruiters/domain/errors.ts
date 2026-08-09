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

/** V4.0 C1 — the acting Recruiter's own RecruiterProfile row is missing; should not happen in practice for a real Recruiter-role actor, but defensive rather than assumed. */
export class RecruiterProfileNotFoundError extends Error {
  constructor() {
    super("Recruiter profile not found");
    this.name = "RecruiterProfileNotFoundError";
  }
}

/** V4.0 C1 — SetShortlistedUseCase's own rule: a student must already be saved before being shortlisted (§8 step 3 — "promotes an already-saved student"). */
export class StudentNotSavedError extends Error {
  constructor() {
    super("Save this student before shortlisting them");
    this.name = "StudentNotSavedError";
  }
}

/** V4.0 C3 — RespondToInterestUseCase: no RecruiterInterestRequest row exists with the given id. */
export class InterestRequestNotFoundError extends Error {
  constructor() {
    super("Interest request not found");
    this.name = "InterestRequestNotFoundError";
  }
}

/** V4.0 C3 — a student may only accept/decline a request while it is still SENT; a second response attempt (or responding to an already-COMPLETED request) is rejected rather than silently overwriting the first decision. */
export class InterestRequestAlreadyRespondedError extends Error {
  constructor() {
    super("This interest request has already been responded to");
    this.name = "InterestRequestAlreadyRespondedError";
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
