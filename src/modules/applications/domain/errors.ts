export class FormApplicationNotFoundError extends Error {
  constructor() {
    super("Form application not found");
    this.name = "FormApplicationNotFoundError";
  }
}

export class DuplicateFormApplicationError extends Error {
  constructor() {
    super("You have already submitted an application for this form");
    this.name = "DuplicateFormApplicationError";
  }
}

export class FormNotAvailableError extends Error {
  constructor(message = "This form is not available for submissions") {
    super(message);
    this.name = "FormNotAvailableError";
  }
}

export class InvalidFormAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFormAnswerError";
  }
}

export class ReviewerNotFoundError extends Error {
  constructor() {
    super("Reviewer not found");
    this.name = "ReviewerNotFoundError";
  }
}

export class ReviewerAlreadyAssignedError extends Error {
  constructor() {
    super("Reviewer is already assigned to this application");
    this.name = "ReviewerAlreadyAssignedError";
  }
}

export class ReviewerNotAssignedError extends Error {
  constructor() {
    super("You are not assigned to review this application");
    this.name = "ReviewerNotAssignedError";
  }
}

export class InvalidFormApplicationTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition application from ${from} to ${to}`);
    this.name = "InvalidFormApplicationTransitionError";
  }
}

export class ApplicationAlreadyDecidedError extends Error {
  constructor() {
    super("This application already has a final decision");
    this.name = "ApplicationAlreadyDecidedError";
  }
}
