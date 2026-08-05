import type { ProfileDraftStatus } from "./entities";

export class DraftNotFoundError extends Error {
  constructor() {
    super("Profile draft not found");
    this.name = "DraftNotFoundError";
  }
}

export class PublishedProfileNotFoundError extends Error {
  constructor() {
    super("No published profile exists for this student");
    this.name = "PublishedProfileNotFoundError";
  }
}

/** Editing is blocked while a draft is under review — see save-draft.ts. */
export class DraftLockedForReviewError extends Error {
  constructor() {
    super("This draft is pending review and cannot be edited until the reviewer responds");
    this.name = "DraftLockedForReviewError";
  }
}

export class InvalidDraftTransitionError extends Error {
  constructor(from: ProfileDraftStatus, action: string) {
    super(`Cannot ${action} a draft currently in status ${from}`);
    this.name = "InvalidDraftTransitionError";
  }
}

export class MissingReviewCommentError extends Error {
  constructor() {
    super("A review comment is required when requesting changes");
    this.name = "MissingReviewCommentError";
  }
}
