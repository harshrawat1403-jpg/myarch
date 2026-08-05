import crypto from "node:crypto";
import type {
  StudentPrivateFields,
  StudentRecord,
  StudentSearchFilters,
  StudentSearchResultItem,
} from "../../../src/modules/students/domain/entities";
import type {
  CreateStudentData,
  StudentRepository,
  UpdateStudentData,
} from "../../../src/modules/students/application/ports/student-repository";

interface SeededBatchInfo {
  batchName: string;
  batchStatus: "ACTIVE" | "GRADUATED" | "ARCHIVED";
}

interface SeededProfileData {
  skills: readonly string[];
  software: readonly string[];
}

const EMPTY_PRIVATE: StudentPrivateFields = {
  phone: null,
  personalEmail: null,
  cgpa: null,
  hasActiveBacklog: false,
  backlogDetails: null,
  internalRemarks: null,
};

export class InMemoryStudentRepository implements StudentRepository {
  private readonly byId = new Map<string, StudentRecord>();
  private readonly byRollNumber = new Map<string, string>();
  private readonly batchInfo = new Map<string, SeededBatchInfo>();
  private readonly profileData = new Map<string, SeededProfileData>();

  /** Test helper: register batch metadata so search() can join against it. */
  seedBatchInfo(batchId: string, info: SeededBatchInfo): void {
    this.batchInfo.set(batchId, info);
  }

  /** Test helper: register skills/software as if a public profile or draft already existed. */
  seedProfileData(studentId: string, data: SeededProfileData): void {
    this.profileData.set(studentId, data);
  }

  async create(data: CreateStudentData): Promise<StudentRecord> {
    const now = new Date();
    const record: StudentRecord = {
      id: crypto.randomUUID(),
      userId: data.userId,
      batchId: data.batchId,
      rollNumber: data.rollNumber,
      fullName: data.fullName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      private: { ...EMPTY_PRIVATE, ...data.private },
    };
    this.byId.set(record.id, record);
    this.byRollNumber.set(record.rollNumber, record.id);
    return record;
  }

  async findById(id: string): Promise<StudentRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findByRollNumber(rollNumber: string): Promise<StudentRecord | null> {
    const id = this.byRollNumber.get(rollNumber);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async update(id: string, data: UpdateStudentData): Promise<StudentRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");

    if (data.batchId && data.batchId !== existing.batchId) {
      // no-op bookkeeping; batchId itself is updated below
    }

    const updated: StudentRecord = {
      ...existing,
      fullName: data.fullName ?? existing.fullName,
      batchId: data.batchId ?? existing.batchId,
      private: data.private ? { ...existing.private, ...data.private } : existing.private,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setActive(id: string, isActive: boolean): Promise<StudentRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated: StudentRecord = { ...existing, isActive, updatedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async search(
    filters: StudentSearchFilters,
    scope: { batchIds?: readonly string[] },
  ): Promise<StudentSearchResultItem[]> {
    const scopeSet = scope.batchIds ? new Set(scope.batchIds) : undefined;

    return [...this.byId.values()]
      .filter((s) => (filters.includeInactive ? true : s.isActive))
      .filter((s) => !scopeSet || scopeSet.has(s.batchId))
      .filter((s) => !filters.batchId || s.batchId === filters.batchId)
      .filter((s) => !filters.name || s.fullName.toLowerCase().includes(filters.name.toLowerCase()))
      .filter(
        (s) =>
          !filters.rollNumber ||
          s.rollNumber.toLowerCase().includes(filters.rollNumber.toLowerCase()),
      )
      .filter((s) => {
        if (!filters.batchStatus) return true;
        return this.batchInfo.get(s.batchId)?.batchStatus === filters.batchStatus;
      })
      .filter((s) => filters.cgpaMin === undefined || (s.private.cgpa ?? -1) >= filters.cgpaMin)
      .filter((s) => filters.cgpaMax === undefined || (s.private.cgpa ?? Infinity) <= filters.cgpaMax)
      .filter((s) => {
        if (!filters.skills || filters.skills.length === 0) return true;
        const skills = this.profileData.get(s.id)?.skills ?? [];
        return filters.skills.some((skill) => skills.includes(skill));
      })
      .filter((s) => {
        if (!filters.software || filters.software.length === 0) return true;
        const software = this.profileData.get(s.id)?.software ?? [];
        return filters.software.some((sw) => software.includes(sw));
      })
      .map((s) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        fullName: s.fullName,
        batchId: s.batchId,
        batchName: this.batchInfo.get(s.batchId)?.batchName ?? "Unknown",
        batchStatus: this.batchInfo.get(s.batchId)?.batchStatus ?? "ACTIVE",
        isActive: s.isActive,
        cgpa: s.private.cgpa,
        hasActiveBacklog: s.private.hasActiveBacklog,
        skills: this.profileData.get(s.id)?.skills ?? [],
        software: this.profileData.get(s.id)?.software ?? [],
      }));
  }
}
