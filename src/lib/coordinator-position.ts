import type { CoordinatorPosition, CoordinatorRecord, MaintenanceCoordinatorRole } from "@/modules/coordinators";

/** Display label only — see CoordinatorPosition doc comment in the coordinators module. */
export function coordinatorPositionLabel(position: CoordinatorPosition | null): string {
  if (position === "T_AND_P") return "T&P";
  if (position === "ALUMNI") return "Alumni";
  if (position === "TECHNICAL") return "Technical Coordinator";
  if (position === "OTHER") return "Other Coordinator";
  return "—";
}

/** Used by the coordinators list page's "Position" search filter — filters the raw `position` column only (T_AND_P/ALUMNI/TECHNICAL/OTHER), independent of maintenanceRole. */
export const COORDINATOR_POSITION_OPTIONS: { value: CoordinatorPosition; label: string }[] = [
  { value: "T_AND_P", label: "T&P" },
  { value: "ALUMNI", label: "Alumni" },
  { value: "TECHNICAL", label: "Technical Coordinator" },
  { value: "OTHER", label: "Other Coordinator" },
];

/**
 * MYARCH unified Coordinator Position system — the single control the
 * create/edit UI presents in place of the old separate Position +
 * Maintenance functional role fields. Deliberately NOT a new backend
 * concept: it is purely a client-side merge of two independent, already-
 * authorized fields (`position`/`customPosition`, edited via
 * PATCH /api/coordinators/[id]; `maintenanceRole`, edited via the existing
 * POST /api/coordinators/[id]/maintenance-role, Secretary-only) — see
 * src/modules/maintenance/domain/permissions.ts's isMaintenanceSecretary
 * doc comment for why the two must stay independent server-side. Every
 * option below other than the Maintenance ones normalizes to
 * position: "TECHNICAL" | "OTHER" with maintenanceRole cleared to null.
 */
export type UnifiedCoordinatorPosition = "TECHNICAL" | "MAINTENANCE_SECRETARY" | "MAINTENANCE_COORDINATOR" | "OTHER";

export const UNIFIED_COORDINATOR_POSITION_OPTIONS: { value: UnifiedCoordinatorPosition; label: string }[] = [
  { value: "TECHNICAL", label: "Technical Coordinator" },
  { value: "MAINTENANCE_SECRETARY", label: "Maintenance Secretary" },
  { value: "MAINTENANCE_COORDINATOR", label: "Maintenance Coordinator" },
  { value: "OTHER", label: "Other Coordinator" },
];

type PositionFields = Pick<CoordinatorRecord, "position" | "customPosition" | "maintenanceRole">;

/**
 * Derives the unified selection from the two independent underlying fields.
 * maintenanceRole always wins (it is the authorization-relevant field);
 * legacy T_AND_P/ALUMNI values bucket into "OTHER" for display (see
 * derivedCustomPositionText) without ever being rewritten unless the Secretary
 * explicitly changes the selection and saves.
 */
export function deriveUnifiedPosition(coordinator: Pick<PositionFields, "position" | "maintenanceRole">): UnifiedCoordinatorPosition {
  if (coordinator.maintenanceRole === "MAINTENANCE_SECRETARY") return "MAINTENANCE_SECRETARY";
  if (coordinator.maintenanceRole === "MAINTENANCE_COORDINATOR") return "MAINTENANCE_COORDINATOR";
  if (coordinator.position === "OTHER") return "OTHER";
  return "TECHNICAL";
}

/** The text to show in the "Specify role/position" input when the derived selection is OTHER — real customPosition for position === "OTHER", a readable derived label for legacy T_AND_P/ALUMNI rows (never written back unless explicitly saved). */
export function derivedCustomPositionText(coordinator: Pick<PositionFields, "position" | "customPosition">): string {
  if (coordinator.position === "OTHER") return coordinator.customPosition ?? "";
  if (coordinator.position === "T_AND_P") return "T&P Coordinator";
  if (coordinator.position === "ALUMNI") return "Alumni Coordinator";
  return "";
}

/** One human-readable label combining position + customPosition + maintenanceRole — for the coordinators list table/cards. */
export function unifiedCoordinatorPositionLabel(coordinator: PositionFields): string {
  if (coordinator.maintenanceRole === "MAINTENANCE_SECRETARY") return "Maintenance Secretary";
  if (coordinator.maintenanceRole === "MAINTENANCE_COORDINATOR") return "Maintenance Coordinator";
  if (coordinator.position === "OTHER") return coordinator.customPosition || "Other Coordinator";
  if (coordinator.position === "T_AND_P") return "T&P Coordinator";
  if (coordinator.position === "ALUMNI") return "Alumni Coordinator";
  return "Technical Coordinator";
}

/** Maps a unified selection + custom text back to the two underlying fields a Save action must submit. */
export function resolveUnifiedPosition(
  option: UnifiedCoordinatorPosition,
  customPositionText: string,
): { position: CoordinatorPosition; customPosition: string | null; maintenanceRole: MaintenanceCoordinatorRole | null } {
  if (option === "OTHER") {
    return { position: "OTHER", customPosition: customPositionText.trim(), maintenanceRole: null };
  }
  if (option === "MAINTENANCE_SECRETARY") {
    return { position: "TECHNICAL", customPosition: null, maintenanceRole: "MAINTENANCE_SECRETARY" };
  }
  if (option === "MAINTENANCE_COORDINATOR") {
    return { position: "TECHNICAL", customPosition: null, maintenanceRole: "MAINTENANCE_COORDINATOR" };
  }
  return { position: "TECHNICAL", customPosition: null, maintenanceRole: null };
}
