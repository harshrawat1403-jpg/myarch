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
