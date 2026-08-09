import crypto from "node:crypto";
import type {
  CreatePlacementDriveData,
  PlacementDriveRecord,
  PlacementDriveSearchFilters,
  PlacementDriveStatus,
  UpdatePlacementDriveData,
} from "../../../src/modules/placements/domain/entities";
import type { PlacementDriveRepository } from "../../../src/modules/placements/application/ports/placement-drive-repository";

export class InMemoryPlacementDriveRepository implements PlacementDriveRepository {
  private readonly byId = new Map<string, PlacementDriveRecord>();
  private readonly companyNames = new Map<string, string>();

  seedCompanyName(companyId: string, name: string): void {
    this.companyNames.set(companyId, name);
  }

  seed(record: PlacementDriveRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreatePlacementDriveData): Promise<PlacementDriveRecord> {
    const now = new Date();
    const record: PlacementDriveRecord = {
      id: crypto.randomUUID(),
      companyId: data.companyId,
      companyName: this.companyNames.get(data.companyId) ?? "Unknown Company",
      title: data.title,
      type: data.type,
      eligibility: data.eligibility,
      packageOrStipend: data.packageOrStipend ?? null,
      description: data.description ?? null,
      status: "DRAFT",
      applicationDeadline: data.applicationDeadline ?? null,
      createdByUserId: data.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<PlacementDriveRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async update(id: string, data: UpdatePlacementDriveData): Promise<PlacementDriveRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No drive with id ${id}`);
    const updated: PlacementDriveRecord = {
      ...existing,
      title: data.title ?? existing.title,
      eligibility: data.eligibility ?? existing.eligibility,
      packageOrStipend: data.packageOrStipend !== undefined ? data.packageOrStipend : existing.packageOrStipend,
      description: data.description !== undefined ? data.description : existing.description,
      applicationDeadline:
        data.applicationDeadline !== undefined ? data.applicationDeadline : existing.applicationDeadline,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: PlacementDriveStatus): Promise<PlacementDriveRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error(`No drive with id ${id}`);
    const updated = { ...existing, status, updatedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: PlacementDriveSearchFilters): Promise<PlacementDriveRecord[]> {
    return [...this.byId.values()].filter((drive) => {
      if (filters.status && drive.status !== filters.status) return false;
      if (filters.type && drive.type !== filters.type) return false;
      if (filters.companyId && drive.companyId !== filters.companyId) return false;
      return true;
    });
  }
}
