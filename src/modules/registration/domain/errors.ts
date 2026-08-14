export class RegistrationBatchNotFoundError extends Error {
  constructor() {
    super("Selected batch not found");
    this.name = "RegistrationBatchNotFoundError";
  }
}

export class RegistrationBatchNotOpenError extends Error {
  constructor() {
    super("This batch is not currently open for registration");
    this.name = "RegistrationBatchNotOpenError";
  }
}

export class DuplicateRegistrationEmailError extends Error {
  constructor() {
    super("An account or pending application already uses this email");
    this.name = "DuplicateRegistrationEmailError";
  }
}

export class DuplicateRegistrationRollNumberError extends Error {
  constructor() {
    super("An account or pending application already uses this roll number");
    this.name = "DuplicateRegistrationRollNumberError";
  }
}

export class RegistrationRequestNotFoundError extends Error {
  constructor() {
    super("Registration request not found");
    this.name = "RegistrationRequestNotFoundError";
  }
}

export class InvalidRegistrationTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRegistrationTransitionError";
  }
}

/** MYARCH Phase 1 (§2.4) — DecideRegistrationRequestUseCase refuses APPROVE until the applicant has verified their email. */
export class RegistrationEmailNotVerifiedError extends Error {
  constructor() {
    super("This applicant has not yet verified their email address");
    this.name = "RegistrationEmailNotVerifiedError";
  }
}
