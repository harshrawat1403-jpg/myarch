import type { AuthenticatedActor } from "@/modules/auth";
import { canViewCompanies } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { CompanyRecord, CompanySearchFilters } from "../../domain/entities";
import type { CompanyRepository } from "../ports/company-repository";

export interface SearchCompaniesInput {
  actor: AuthenticatedActor;
  filters: CompanySearchFilters;
}

export class SearchCompaniesUseCase {
  constructor(private readonly deps: { companyRepository: CompanyRepository }) {}

  async execute(input: SearchCompaniesInput): Promise<CompanyRecord[]> {
    if (!canViewCompanies(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view companies");
    }
    return this.deps.companyRepository.search(input.filters);
  }
}
