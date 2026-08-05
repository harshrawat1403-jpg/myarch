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
