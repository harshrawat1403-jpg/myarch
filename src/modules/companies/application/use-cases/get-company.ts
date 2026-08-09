import type { AuthenticatedActor } from "@/modules/auth";
import { canViewCompanies } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { CompanyRecord } from "../../domain/entities";
import { CompanyNotFoundError } from "../../domain/errors";
import type { CompanyRepository } from "../ports/company-repository";

export interface GetCompanyInput {
  actor: AuthenticatedActor;
  companyId: string;
}

export class GetCompanyUseCase {
  constructor(private readonly deps: { companyRepository: CompanyRepository }) {}

  async execute(input: GetCompanyInput): Promise<CompanyRecord> {
    if (!canViewCompanies(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view companies");
    }
    const company = await this.deps.companyRepository.findById(input.companyId);
    if (!company) throw new CompanyNotFoundError();
    return company;
  }
}
