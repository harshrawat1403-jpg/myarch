import type { CompanyRecord, CompanySearchFilters } from "../../domain/entities";

export interface CreateCompanyData {
  name: string;
  sector?: string;
  website?: string;
}

export interface UpdateCompanyData {
  name?: string;
  sector?: string | null;
  website?: string | null;
}

export interface CompanyRepository {
  create(data: CreateCompanyData): Promise<CompanyRecord>;
  findById(id: string): Promise<CompanyRecord | null>;
  /** Case-insensitive — used for the duplicate-name check before create. */
  findByName(name: string): Promise<CompanyRecord | null>;
  update(id: string, data: UpdateCompanyData): Promise<CompanyRecord>;
  setActive(id: string, isActive: boolean): Promise<CompanyRecord>;
  search(filters: CompanySearchFilters): Promise<CompanyRecord[]>;
}
