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

export interface CoordinatorRecord {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly fullName: string;
  readonly isActive: boolean;
  readonly position: CoordinatorPosition | null;
  readonly batchIds: readonly string[];
  /** Sourced from User.createdAt — CoordinatorProfile itself has no createdAt column. */
  readonly createdAt: Date;
}

export interface CoordinatorSearchFilters {
  readonly name?: string;
  readonly email?: string;
  readonly includeInactive?: boolean;
  readonly position?: CoordinatorPosition;
}
