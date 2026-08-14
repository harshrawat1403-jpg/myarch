import type { RequestStatus } from "./entities";

/**
 * §3.7's documented chain. REVIEW → ASSIGNED is only reachable once a
 * decision of APPROVED has been recorded (see AssignRequestUseCase's own
 * guard, not this pure map — the map alone can't know about `decision`).
 * REVIEW → CLOSED is the rejection path (DecideRequestUseCase).
 */
const ALLOWED_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  SUBMITTED: ["REVIEW"],
  REVIEW: ["ASSIGNED", "CLOSED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
};

export function isValidRequestTransition(from: RequestStatus, to: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
