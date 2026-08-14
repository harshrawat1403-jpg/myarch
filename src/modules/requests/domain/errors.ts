export class RequestNotFoundError extends Error {
  constructor() {
    super("Request not found");
    this.name = "RequestNotFoundError";
  }
}

export class InvalidRequestTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move a request from ${from} to ${to}`);
    this.name = "InvalidRequestTransitionError";
  }
}

/** AssignRequestUseCase — a request must be decided APPROVED before it can be assigned an owner. */
export class RequestNotApprovedError extends Error {
  constructor() {
    super("This request has not been approved yet");
    this.name = "RequestNotApprovedError";
  }
}

export class RequestAlreadyDecidedError extends Error {
  constructor() {
    super("This request has already been decided");
    this.name = "RequestAlreadyDecidedError";
  }
}

export class InvalidRequestOwnerError extends Error {
  constructor() {
    super("Requests can only be assigned to a Technical Secretary or Coordinator account");
    this.name = "InvalidRequestOwnerError";
  }
}

export class InvalidRequestAttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestAttachmentError";
  }
}
