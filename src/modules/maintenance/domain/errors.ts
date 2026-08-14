export class MaintenanceIssueNotFoundError extends Error {
  constructor() {
    super("Maintenance issue not found");
    this.name = "MaintenanceIssueNotFoundError";
  }
}

export class InvalidMaintenanceIssueTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move a maintenance issue from ${from} to ${to}`);
    this.name = "InvalidMaintenanceIssueTransitionError";
  }
}

export class MaintenanceIssueNotReopenableError extends Error {
  constructor() {
    super("Only a resolved, verified, or closed issue can be reopened");
    this.name = "MaintenanceIssueNotReopenableError";
  }
}

/** AssignMaintenanceIssueUseCase — the target account must be Secretary or Coordinator; Students report issues, they don't get assigned facility work. */
export class InvalidMaintenanceAssigneeError extends Error {
  constructor() {
    super("Maintenance issues can only be assigned to a Technical Secretary or Coordinator account");
    this.name = "InvalidMaintenanceAssigneeError";
  }
}

export class InvalidMaintenanceAttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMaintenanceAttachmentError";
  }
}
