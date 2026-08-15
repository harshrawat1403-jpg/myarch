import type { MeetingStatus } from "./entities";

/** SCHEDULED -> COMPLETED or CANCELLED. No reopen — a completed/cancelled meeting stays that way. */
const VALID_TRANSITIONS: Record<MeetingStatus, readonly MeetingStatus[]> = {
  SCHEDULED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidMeetingTransition(from: MeetingStatus, to: MeetingStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
