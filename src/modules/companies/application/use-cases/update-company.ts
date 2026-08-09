import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCompanies } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CompanyRecord } from "../../domain/entities";
import { CompanyNotFoundError, DuplicateCompanyNameError } from "../../domain/errors";
import type { CompanyRepository } from "../ports/company-repository";

export interface UpdateCompanyInput {
  actor: AuthenticatedActor;
  companyId: string;
  name?: string;
  sector?: string | null;
  website?: string | null;
}

export interface UpdateCompanyUseCaseDeps {
  companyRepository: CompanyRepository;
  auditRecorder: AuditRecorder;
}

export class UpdateCompanyUseCase {
  constructor(private readonly deps: UpdateCompanyUseCaseDeps) {}

  async execute(input: UpdateCompanyInput): Promise<CompanyRecord> {
    if (!canManageCompanies(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage companies");
    }

    const existing = await this.deps.companyRepository.findById(input.companyId);
    if (!existing) throw new CompanyNotFoundError();

    if (input.name && input.name !== existing.name) {
      const duplicate = await this.deps.companyRepository.findByName(input.name);
      if (duplicate && duplicate.id !== existing.id) throw new DuplicateCompanyNameError(input.name);
    }

    const updated = await this.deps.companyRepository.update(input.companyId, {
      name: input.name,
      sector: input.sector,
      website: input.website,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.COMPANY_UPDATED,
      targetEntityType: "Company",
      targetEntityId: existing.id,
    });

    return updated;
  }
}
