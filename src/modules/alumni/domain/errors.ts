export class AlumniNotFoundError extends Error {
  constructor() {
    super("Alumni record not found");
    this.name = "AlumniNotFoundError";
  }
}

/** CreateAlumniUseCase/UpdateAlumniUseCase — the given studentProfileId doesn't resolve to a real StudentProfile row. */
export class StudentProfileNotFoundError extends Error {
  constructor() {
    super("The linked student profile was not found");
    this.name = "StudentProfileNotFoundError";
  }
}

/** A StudentProfile may back at most one AlumniProfile (the schema's own unique constraint). */
export class DuplicateAlumniLinkError extends Error {
  constructor() {
    super("This student profile is already linked to another alumni record");
    this.name = "DuplicateAlumniLinkError";
  }
}

// MYARCH Phase 1 (§2.4) — self-signup + admin approve/reject. Mirrors
// recruiters/domain/errors.ts's DuplicateEmailError/RecruiterNotPendingError
// exactly (deliberately re-declared here rather than imported, per this
// module's own isolation convention above).

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account with email "${email}" already exists`);
    this.name = "DuplicateEmailError";
  }
}

/** ApproveAlumniUseCase/RejectAlumniUseCase only operate on a PENDING account — admin-created directory rows default to APPROVED and never reach this path. */
export class AlumniNotPendingError extends Error {
  constructor() {
    super("This alumni account is not pending approval");
    this.name = "AlumniNotPendingError";
  }
}
