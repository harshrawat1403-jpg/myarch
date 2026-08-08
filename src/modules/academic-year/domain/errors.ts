export class BatchNotEligibleForGraduationError extends Error {
  constructor(batchName: string) {
    super(`"${batchName}" is not currently Active, so it cannot be graduated`);
    this.name = "BatchNotEligibleForGraduationError";
  }
}

export class BatchNotEligibleForArchivalError extends Error {
  constructor(batchName: string) {
    super(`"${batchName}" is not currently Graduated, so it cannot be archived`);
    this.name = "BatchNotEligibleForArchivalError";
  }
}

export class TransitionBatchNotFoundError extends Error {
  constructor() {
    super("One of the selected batches could not be found");
    this.name = "TransitionBatchNotFoundError";
  }
}

export class TransitionCoordinatorNotFoundError extends Error {
  constructor() {
    super("One of the selected coordinators could not be found");
    this.name = "TransitionCoordinatorNotFoundError";
  }
}

export class InvalidConfirmationTextError extends Error {
  constructor() {
    super('You must type "CONFIRM" exactly to proceed');
    this.name = "InvalidConfirmationTextError";
  }
}

export class AcademicYearTransitionRunNotFoundError extends Error {
  constructor() {
    super("Academic year transition run not found");
    this.name = "AcademicYearTransitionRunNotFoundError";
  }
}
