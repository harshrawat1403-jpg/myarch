import crypto from "node:crypto";
import type { CompanyRecord, CompanySearchFilters } from "../../../src/modules/companies";
import type {
  CompanyRepository,
  CreateCompanyData,
  UpdateCompanyData,
} from "../../../src/modules/companies/application/ports/company-repository";

export class InMemoryCompanyRepository implements CompanyRepository {
  private readonly byId = new Map<string, CompanyRecord>();

  seed(record: CompanyRecord): void {
    this.byId.set(record.id, record);
  }

  async create(data: CreateCompanyData): Promise<CompanyRecord> {
    const now = new Date();
    const record: CompanyRecord = {
      id: crypto.randomUUID(),
      name: data.name,
      sector: data.sector ?? null,
      website: data.website ?? null,
      logoFileId: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<CompanyRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findByName(name: string): Promise<CompanyRecord | null> {
    for (const record of this.byId.values()) {
      if (record.name.toLowerCase() === name.toLowerCase()) return record;
    }
    return null;
  }

  async update(id: string, data: UpdateCompanyData): Promise<CompanyRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated: CompanyRecord = {
      ...existing,
      name: data.name ?? existing.name,
      sector: data.sector !== undefined ? data.sector : existing.sector,
      website: data.website !== undefined ? data.website : existing.website,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async setActive(id: string, isActive: boolean): Promise<CompanyRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, isActive, updatedAt: new Date() };
    this.byId.set(id, updated);
    return updated;
  }

  async search(filters: CompanySearchFilters): Promise<CompanyRecord[]> {
    return [...this.byId.values()].filter((record) => {
      if (!filters.includeInactive && !record.isActive) return false;
      if (filters.name && !record.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      return true;
    });
  }
}
