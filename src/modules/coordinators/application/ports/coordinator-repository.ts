import type { CoordinatorRecord, CoordinatorSearchFilters } from "../../domain/entities";

export interface CreateCoordinatorData {
  userId: string;
  fullName: string;
}

export interface UpdateCoordinatorData {
  fullName?: string;
}

export interface CoordinatorRepository {
  create(data: CreateCoordinatorData): Promise<CoordinatorRecord>;
  findById(id: string): Promise<CoordinatorRecord | null>;
  findByUserId(userId: string): Promise<CoordinatorRecord | null>;
  update(id: string, data: UpdateCoordinatorData): Promise<CoordinatorRecord>;

  /** Flips CoordinatorProfile.isActive and User.isActive together, in one transaction — mirrors PrismaStudentRepository.setActive. */
  setActive(id: string, isActive: boolean): Promise<CoordinatorRecord>;

  search(filters: CoordinatorSearchFilters): Promise<CoordinatorRecord[]>;

  assignBatch(id: string, batchId: string): Promise<CoordinatorRecord>;
  removeBatch(id: string, batchId: string): Promise<CoordinatorRecord>;
}
