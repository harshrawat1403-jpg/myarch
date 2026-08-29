export class CommitteeNotFoundError extends Error {
  constructor() {
    super("Committee not found");
    this.name = "CommitteeNotFoundError";
  }
}

export class CommitteeMembershipNotFoundError extends Error {
  constructor() {
    super("Committee membership not found");
    this.name = "CommitteeMembershipNotFoundError";
  }
}

export class DuplicateCommitteeMembershipError extends Error {
  constructor() {
    super("This user already has an active membership on this committee");
    this.name = "DuplicateCommitteeMembershipError";
  }
}

export class InvalidCommitteeAttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCommitteeAttachmentError";
  }
}
