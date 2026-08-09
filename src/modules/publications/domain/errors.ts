export class PublicationNotFoundError extends Error {
  constructor(message = "Publication not found") {
    super(message);
    this.name = "PublicationNotFoundError";
  }
}

export class PublicationTemplateNotFoundError extends Error {
  constructor(message = "Publication template not found") {
    super(message);
    this.name = "PublicationTemplateNotFoundError";
  }
}

export class PublicationVersionNotFoundError extends Error {
  constructor(message = "Publication version not found") {
    super(message);
    this.name = "PublicationVersionNotFoundError";
  }
}

export class PublicationExportNotFoundError extends Error {
  constructor(message = "Publication export not found") {
    super(message);
    this.name = "PublicationExportNotFoundError";
  }
}

/** Optimistic-lock conflict (§13.4) — someone else saved this publication since the caller last loaded it. */
export class PublicationVersionConflictError extends Error {
  constructor(message = "This publication was edited by someone else — reload and try again") {
    super(message);
    this.name = "PublicationVersionConflictError";
  }
}

export class InvalidPublicationContentError extends Error {
  constructor(message = "Invalid publication content") {
    super(message);
    this.name = "InvalidPublicationContentError";
  }
}
