export class EventNotFoundError extends Error {
  constructor() {
    super("Event not found");
    this.name = "EventNotFoundError";
  }
}

export class InvalidEventTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move an event from ${from} to ${to}`);
    this.name = "InvalidEventTransitionError";
  }
}

export class InvalidEventAttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEventAttachmentError";
  }
}

export class EventNotRegistrableError extends Error {
  constructor() {
    super("This event is not open for registration");
    this.name = "EventNotRegistrableError";
  }
}

export class AlreadyRegisteredForEventError extends Error {
  constructor() {
    super("Already registered for this event");
    this.name = "AlreadyRegisteredForEventError";
  }
}

export class NotRegisteredForEventError extends Error {
  constructor() {
    super("This user is not registered for the event");
    this.name = "NotRegisteredForEventError";
  }
}

export class DuplicateEventParticipantError extends Error {
  constructor() {
    super("This user is already a participant on this event");
    this.name = "DuplicateEventParticipantError";
  }
}
