import type { ApplicationStatus, PlacementDriveType } from "./entities";

/**
 * V4.0 D1 (§11) — the pipeline walk APPLIED → SHORTLISTED → INTERVIEW →
 * OFFER → ACCEPTED, with REJECTED/WITHDRAWN as terminal exits from any
 * non-terminal state, and ACCEPTED → ACTIVE → COMPLETED reserved for
 * INTERNSHIP drives only (§5.1's "the two extra states referenced in §5.1").
 * A pure function so the transition rules are unit-testable without a
 * database, and so both UpdateApplicationStatusUseCase and
 * WithdrawApplicationUseCase share exactly one source of truth for "is this
 * move allowed."
 */
const FORWARD_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  APPLIED: ["SHORTLISTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["INTERVIEW", "REJECTED", "WITHDRAWN"],
  INTERVIEW: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED: ["ACTIVE", "WITHDRAWN"],
  ACTIVE: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
  WITHDRAWN: [],
};

export function isValidApplicationStatusTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  driveType: PlacementDriveType,
): boolean {
  if (to === "ACTIVE" && driveType !== "INTERNSHIP") return false;
  return FORWARD_TRANSITIONS[from].includes(to);
}
