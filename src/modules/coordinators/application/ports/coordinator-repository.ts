import type {
  CoordinatorPosition,
  CoordinatorRecord,
  CoordinatorSearchFilters,
  MaintenanceCoordinatorRole,
} from "../../domain/entities";

export interface CreateCoordinatorData {
  userId: string;
  fullName: string;
  position?: CoordinatorPosition | null;
}

export interface UpdateCoordinatorData {
  fullName?: string;
  position?: CoordinatorPosition | null;
}

export interface CoordinatorRepository {
  create(data: CreateCoordinatorData): Promise<CoordinatorRecord>;
  findById(id: string): Promise<CoordinatorRecord | null>;
  findByUserId(userId: string): Promise<CoordinatorRecord | null>;
  update(id: string, data: UpdateCoordinatorData): Promise<CoordinatorRecord>;

  /** Flips CoordinatorProfile.isActive and User.isActive together, in one transaction — mirrors PrismaStudentRepository.setActive. */
  setActive(id: string, isActive: boolean): Promise<CoordinatorRecord>;

  /** MYARCH Phase 1 — roadmap §2.1's "maximum 2 active Coordinators," checked before creating a new one or reactivating an existing one. */
  countActive(): Promise<number>;

  /** MYARCH Phase 1 — replaces the full delegated-permission set (Technical-Secretary-only, via UpdateCoordinatorPermissionsUseCase). */
  setPermissions(id: string, permissions: readonly string[]): Promise<CoordinatorRecord>;

  /** MYARCH Maintenance functional hierarchy — sets or clears (null) this Coordinator's designation. */
  setMaintenanceRole(id: string, maintenanceRole: MaintenanceCoordinatorRole | null): Promise<CoordinatorRecord>;

  /** Counted excluding a given coordinatorId (so re-saving the same designation on the same Coordinator never trips the at-most-one check) — checked before designating a new one. */
  countActiveByMaintenanceRole(role: MaintenanceCoordinatorRole, excludingId?: string): Promise<number>;

  /** The one active Coordinator currently holding this designation, if any — used to resolve "the" Maintenance Coordinator without trusting a client-supplied id. */
  findActiveByMaintenanceRole(role: MaintenanceCoordinatorRole): Promise<CoordinatorRecord | null>;

  search(filters: CoordinatorSearchFilters): Promise<CoordinatorRecord[]>;

  assignBatch(id: string, batchId: string): Promise<CoordinatorRecord>;
  removeBatch(id: string, batchId: string): Promise<CoordinatorRecord>;
}
