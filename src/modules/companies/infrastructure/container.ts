import { prisma } from "@/lib/prisma";
import { PrismaAuditRecorder } from "@/lib/audit";
import { CreateCompanyUseCase } from "../application/use-cases/create-company";
import { UpdateCompanyUseCase } from "../application/use-cases/update-company";
import { SetCompanyActiveUseCase } from "../application/use-cases/set-company-active";
import { SearchCompaniesUseCase } from "../application/use-cases/search-companies";
import { GetCompanyUseCase } from "../application/use-cases/get-company";
import { PrismaCompanyRepository } from "./prisma-company-repository";

// No secrets required — safe to construct eagerly.
const companyRepository = new PrismaCompanyRepository(prisma);
const auditRecorder = new PrismaAuditRecorder(prisma);

export const createCompanyUseCase = new CreateCompanyUseCase({ companyRepository, auditRecorder });
export const updateCompanyUseCase = new UpdateCompanyUseCase({ companyRepository, auditRecorder });
export const setCompanyActiveUseCase = new SetCompanyActiveUseCase({ companyRepository, auditRecorder });
export const searchCompaniesUseCase = new SearchCompaniesUseCase({ companyRepository });
export const getCompanyUseCase = new GetCompanyUseCase({ companyRepository });
