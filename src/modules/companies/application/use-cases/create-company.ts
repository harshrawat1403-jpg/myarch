import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCompanies } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CompanyRecord } from "../../domain/entities";
import { DuplicateCompanyNameError } from "../../domain/errors";
import type { CompanyRepository } from "../ports/company-repository";

export interface CreateCompanyInput {
  actor: AuthenticatedActor;
  name: string;
  sector?: string;
  website?: string;
}

export interface CreateCompanyUseCaseDeps {
  companyRepository: CompanyRepository;
  auditRecorder: AuditRecorder;
}

export class CreateCompanyUseCase {
  constructor(private readonly deps: CreateCompanyUseCaseDeps) {}

  async execute(input: CreateCompanyInput): Promise<CompanyRecord> {
    if (!canManageCompanies(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage companies");
    }

    const existing = await this.deps.companyRepository.findByName(input.name);
    if (existing) throw new DuplicateCompanyNameError(input.name);

    const company = await this.deps.companyRepository.create({
      name: input.name,
      sector: input.sector,
      website: input.website,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMPANY_CREATED,
      targetEntityType: "Company",
      targetEntityId: company.id,
    });

    return company;
  }
}
