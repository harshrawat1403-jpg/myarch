import type { EventStatus } from "./entities";

/** DRAFT -> PUBLISHED -> COMPLETED, with CANCELLED reachable from either non-terminal state. No reopen — a cancelled/completed event stays that way (unlike Task/MaintenanceIssue, nothing here re-enters an SLA clock). */
const VALID_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidEventTransition(from: EventStatus, to: EventStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
