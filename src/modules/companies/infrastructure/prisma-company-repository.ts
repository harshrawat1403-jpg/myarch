import type { Company as PrismaCompany, Prisma, PrismaClient } from "@prisma/client";
import type { CompanyRecord, CompanySearchFilters } from "../domain/entities";
import type { CompanyRepository, CreateCompanyData, UpdateCompanyData } from "../application/ports/company-repository";

export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCompanyData): Promise<CompanyRecord> {
    const row = await this.prisma.company.create({
      data: { name: data.name, sector: data.sector, website: data.website },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<CompanyRecord | null> {
    const row = await this.prisma.company.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByName(name: string): Promise<CompanyRecord | null> {
    const row = await this.prisma.company.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, data: UpdateCompanyData): Promise<CompanyRecord> {
    const row = await this.prisma.company.update({
      where: { id },
      data: { name: data.name, sector: data.sector, website: data.website },
    });
    return toDomain(row);
  }

  async setActive(id: string, isActive: boolean): Promise<CompanyRecord> {
    const row = await this.prisma.company.update({ where: { id }, data: { isActive } });
    return toDomain(row);
  }

  async search(filters: CompanySearchFilters): Promise<CompanyRecord[]> {
    const where: Prisma.CompanyWhereInput = {
      isActive: filters.includeInactive ? undefined : true,
      name: filters.name ? { contains: filters.name, mode: "insensitive" } : undefined,
    };

    const rows = await this.prisma.company.findMany({ where, orderBy: { name: "asc" } });
    return rows.map(toDomain);
  }
}

function toDomain(row: PrismaCompany): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    website: row.website,
    logoFileId: row.logoFileId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
