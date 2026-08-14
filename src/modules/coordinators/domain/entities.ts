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
  /** MYARCH Phase 1 — granular capabilities delegated by the Technical Secretary. See domain/permissions.ts. */
  readonly permissions: readonly string[];
  /** Sourced from User.createdAt — CoordinatorProfile itself has no createdAt column. */
  readonly createdAt: Date;
}

/** Roadmap §2.1 — "Maximum ACTIVE Coordinators = 2," enforced server-side, not merely a UI limit. Shared by CreateCoordinatorUseCase and SetCoordinatorActiveUseCase (reactivation). */
export const MAX_ACTIVE_COORDINATORS = 2;

export interface CoordinatorSearchFilters {
  readonly name?: string;
  readonly email?: string;
  readonly includeInactive?: boolean;
  readonly position?: CoordinatorPosition;
}
