/**
 * Framework-free Domain layer types for the coordinators module — mirrors
 * students/domain/entities.ts's shape conventions. A Coordinator has no
 * "private fields" the way a Student does (no CGPA/backlog/remarks — a
 * Coordinator's own admin-relevant data is just name, active status, and
 * batch scope), so this is deliberately thinner than StudentRecord.
 */

/**
 * Unified Coordinator Position — display/reporting label only (V4.0 A1,
 * extended by the MYARCH unified position amendment). No permission function
 * ever reads this field; Maintenance authorization is driven entirely by the
 * separate `maintenanceRole` field below, never by this one. T_AND_P/ALUMNI
 * are legacy values kept for existing data and no longer offered to new
 * Coordinators; TECHNICAL is the ordinary-Coordinator default; OTHER pairs
 * with `customPosition` on CoordinatorRecord (its free-text label).
 */
export type CoordinatorPosition = "T_AND_P" | "ALUMNI" | "TECHNICAL" | "OTHER";

/**
 * MYARCH Maintenance functional hierarchy — mirrors the auth module's own
 * MaintenanceCoordinatorRole (re-declared here per this module's own
 * cross-module isolation convention, same reasoning as every other
 * re-declared port/type in this codebase). Null for the overwhelming
 * majority of Coordinators; both non-null values still count toward
 * MAX_ACTIVE_COORDINATORS below — see MAX_ACTIVE_MAINTENANCE_SECRETARIES/
 * MAX_ACTIVE_MAINTENANCE_COORDINATORS for the additional, narrower
 * at-most-one-of-each invariant layered on top.
 */
export type MaintenanceCoordinatorRole = "MAINTENANCE_SECRETARY" | "MAINTENANCE_COORDINATOR";

export interface CoordinatorRecord {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly fullName: string;
  readonly isActive: boolean;
  readonly position: CoordinatorPosition | null;
  /** Free-text label, meaningful only when position === "OTHER" — see CoordinatorPosition's own doc comment. Always null otherwise. */
  readonly customPosition: string | null;
  readonly batchIds: readonly string[];
  /** MYARCH Phase 1 — granular capabilities delegated by the Technical Secretary. See domain/permissions.ts. */
  readonly permissions: readonly string[];
  /** MYARCH Maintenance functional hierarchy — see MaintenanceCoordinatorRole's own doc comment. */
  readonly maintenanceRole: MaintenanceCoordinatorRole | null;
  /** Sourced from User.createdAt — CoordinatorProfile itself has no createdAt column. */
  readonly createdAt: Date;
}

/** Roadmap §2.1 — "Maximum ACTIVE Coordinators = 2," enforced server-side, not merely a UI limit. Shared by CreateCoordinatorUseCase and SetCoordinatorActiveUseCase (reactivation). */
export const MAX_ACTIVE_COORDINATORS = 2;

/**
 * MYARCH Maintenance functional hierarchy — both Maintenance Secretary and
 * Maintenance Coordinator consume one of the MAX_ACTIVE_COORDINATORS slots
 * above (a deliberate product decision — they are not additional headcount);
 * this pair is the narrower "at most one of each" constraint layered on top,
 * enforced the same way (count-then-check in the application layer) by
 * SetCoordinatorMaintenanceRoleUseCase.
 */
export const MAX_ACTIVE_MAINTENANCE_SECRETARIES = 1;
export const MAX_ACTIVE_MAINTENANCE_COORDINATORS = 1;

export interface CoordinatorSearchFilters {
  readonly name?: string;
  readonly email?: string;
  readonly includeInactive?: boolean;
  readonly position?: CoordinatorPosition;
}

/**
 * The one place position + customPosition are validated together — shared by
 * CreateCoordinatorUseCase and UpdateCoordinatorUseCase so the invariant
 * ("customPosition is required and trimmed when position is OTHER, and is
 * always cleared to null otherwise") can never drift between the two call
 * sites. Throws InvalidCustomPositionError (domain/errors.ts) rather than
 * importing it here to avoid a hard dependency in this framework-free file —
 * callers pass their own error class in.
 */
export function normalizeCoordinatorPosition(
  position: CoordinatorPosition | null | undefined,
  customPosition: string | null | undefined,
  onMissingCustomPosition: () => never,
): { position: CoordinatorPosition | null; customPosition: string | null } {
  if (position !== "OTHER") {
    return { position: position ?? null, customPosition: null };
  }
  const trimmed = customPosition?.trim();
  if (!trimmed) onMissingCustomPosition();
  return { position: "OTHER", customPosition: trimmed! };
}
