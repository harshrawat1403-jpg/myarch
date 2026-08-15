import crypto from "node:crypto";
import type { CoordinatorRecord, CoordinatorSearchFilters, MaintenanceCoordinatorRole } from "../../../src/modules/coordinators";
import type {
  CoordinatorRepository,
  CreateCoordinatorData,
  UpdateCoordinatorData,
} from "../../../src/modules/coordinators/application/ports/coordinator-repository";

export class InMemoryCoordinatorRepository implements CoordinatorRepository {
  private readonly byId = new Map<string, CoordinatorRecord>();

  /** Test-only seed helper — bypasses the userId/email split real creation goes through. */
  seed(record: CoordinatorRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateCoordinatorData): Promise<CoordinatorRecord> {
    const record: CoordinatorRecord = {
      id: crypto.randomUUID(),
      userId: data.userId,
      email: `seeded-${data.userId}@example.edu`,
      fullName: data.fullName,
      isActive: true,
      position: data.position ?? null,
      batchIds: [],
      permissions: [],
      maintenanceRole: null,
      createdAt: new Date(),
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<CoordinatorRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<CoordinatorRecord | null> {
    for (const record of this.byId.values()) {
      if (record.userId === userId) return record;
    }
    return null;
  }

  async update(id: string, data: UpdateCoordinatorData): Promise<CoordinatorRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = {
      ...existing,
      fullName: data.fullName ?? existing.fullName,
      position: data.position !== undefined ? data.position : existing.position,
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setActive(id: string, isActive: boolean): Promise<CoordinatorRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, isActive };
    this.byId.set(id, updated);
    return updated;
  }

  async countActive(): Promise<number> {
    return [...this.byId.values()].filter((record) => record.isActive).length;
  }

  async setPermissions(id: string, permissions: readonly string[]): Promise<CoordinatorRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, permissions };
    this.byId.set(id, updated);
    return updated;
  }

  async setMaintenanceRole(id: string, maintenanceRole: MaintenanceCoordinatorRole | null): Promise<CoordinatorRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, maintenanceRole };
    this.byId.set(id, updated);
    return updated;
  }

  async countActiveByMaintenanceRole(role: MaintenanceCoordinatorRole, excludingId?: string): Promise<number> {
    return [...this.byId.values()].filter(
      (record) => record.maintenanceRole === role && record.isActive && record.id !== excludingId,
    ).length;
  }

  async findActiveByMaintenanceRole(role: MaintenanceCoordinatorRole): Promise<CoordinatorRecord | null> {
    return [...this.byId.values()].find((record) => record.maintenanceRole === role && record.isActive) ?? null;
  }

  async search(filters: CoordinatorSearchFilters): Promise<CoordinatorRecord[]> {
    return [...this.byId.values()].filter((record) => {
      if (!filters.includeInactive && !record.isActive) return false;
      if (filters.name && !record.fullName.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.email && !record.email.toLowerCase().includes(filters.email.toLowerCase())) return false;
      if (filters.position && record.position !== filters.position) return false;
      return true;
    });
  }

  async assignBatch(id: string, batchId: string): Promise<CoordinatorRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, batchIds: [...existing.batchIds, batchId] };
    this.byId.set(id, updated);
    return updated;
  }

  async removeBatch(id: string, batchId: string): Promise<CoordinatorRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, batchIds: existing.batchIds.filter((b) => b !== batchId) };
    this.byId.set(id, updated);
    return updated;
  }
}
