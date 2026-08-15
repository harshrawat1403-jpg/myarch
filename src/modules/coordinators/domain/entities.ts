/**
 * Framework-free Domain layer types for the coordinators module — mirrors
 * students/domain/entities.ts's shape conventions. A Coordinator has no
 * "private fields" the way a Student does (no CGPA/backlog/remarks — a
 * Coordinator's own admin-relevant data is just name, active status, and
 * batch scope), so this is deliberately thinner than StudentRecord.
 */

/**
 * T&P vs Alumni — display/reporting label only (V4.0 A1). Both positions
 * have byte-for-byte identical permissions; no permission function ever
 * reads this field.
 */
export type CoordinatorPosition = "T_AND_P" | "ALUMNI";

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
