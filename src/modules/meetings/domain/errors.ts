export class MeetingNotFoundError extends Error {
  constructor() {
    super("Meeting not found");
    this.name = "MeetingNotFoundError";
  }
}

export class InvalidMeetingTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move a meeting from ${from} to ${to}`);
    this.name = "InvalidMeetingTransitionError";
  }
}

export class DuplicateMeetingParticipantError extends Error {
  constructor() {
    super("This user is already a participant on this meeting");
    this.name = "DuplicateMeetingParticipantError";
  }
}
