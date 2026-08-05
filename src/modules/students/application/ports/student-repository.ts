import type {
  StudentPrivateFields,
  StudentRecord,
  StudentSearchFilters,
  StudentSearchResultItem,
} from "../../domain/entities";

export interface CreateStudentData {
  userId: string;
  batchId: string;
  rollNumber: string;
  fullName: string;
  private: Partial<StudentPrivateFields>;
  /** Who is performing the creation — stamped onto StudentPrivateProfile.updatedByUserId. */
  actorUserId: string;
}

export interface UpdateStudentData {
  fullName?: string;
  batchId?: string;
  private?: Partial<StudentPrivateFields>;
  /** Who is performing the update — stamped onto StudentPrivateProfile.updatedByUserId when private fields change. */
  actorUserId: string;
}

export interface StudentRepository {
  create(data: CreateStudentData): Promise<StudentRecord>;
  findById(id: string): Promise<StudentRecord | null>;
  findByRollNumber(rollNumber: string): Promise<StudentRecord | null>;
  update(id: string, data: UpdateStudentData): Promise<StudentRecord>;
  setActive(id: string, isActive: boolean): Promise<StudentRecord>;

  /**
   * Restricted to `batchIds` when provided (a Coordinator's scope) — the
   * repository itself enforces the boundary at the query level, not a
   * post-fetch filter (docs/security/14_Security_Architecture.md).
   */
  search(
    filters: StudentSearchFilters,
    scope: { batchIds?: readonly string[] },
  ): Promise<StudentSearchResultItem[]>;
}
