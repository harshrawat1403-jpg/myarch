import type { PlacementDriveStatus } from "./entities";

/**
 * V4.0 D1 — forward-only drive lifecycle. DRAFT → ANNOUNCED is the
 * "publish" decision (Secretary-only, see canPublishPlacementDrive); the
 * remaining transitions are ordinary operational status changes a scoped
 * Coordinator may also make (see canManagePlacementDrive).
 */
const FORWARD_TRANSITIONS: Record<PlacementDriveStatus, readonly PlacementDriveStatus[]> = {
  DRAFT: ["ANNOUNCED"],
  ANNOUNCED: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["CLOSED"],
  CLOSED: [],
};

export function isValidDriveStatusTransition(from: PlacementDriveStatus, to: PlacementDriveStatus): boolean {
  return FORWARD_TRANSITIONS[from].includes(to);
}

/** A drive accepts new applications only once live and not yet closed out. */
export function isDriveOpenForApplications(status: PlacementDriveStatus): boolean {
  return status === "ANNOUNCED" || status === "IN_PROGRESS";
}
