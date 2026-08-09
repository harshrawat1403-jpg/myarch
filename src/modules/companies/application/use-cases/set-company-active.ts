import type { AuthenticatedActor } from "@/modules/auth";
import { canManageCompanies } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CompanyRecord } from "../../domain/entities";
import { CompanyAlreadyActiveError, CompanyAlreadyDisabledError, CompanyNotFoundError } from "../../domain/errors";
import type { CompanyRepository } from "../ports/company-repository";

export interface SetCompanyActiveInput {
  actor: AuthenticatedActor;
  companyId: string;
  isActive: boolean;
}

export interface SetCompanyActiveUseCaseDeps {
  companyRepository: CompanyRepository;
  auditRecorder: AuditRecorder;
}

/** One use case for both disable and enable, mirroring SetCoordinatorActiveUseCase — Company has no session to revoke (not a login-capable entity, §24 Q5), so disabling is a pure directory-visibility toggle. */
export class SetCompanyActiveUseCase {
  constructor(private readonly deps: SetCompanyActiveUseCaseDeps) {}

  async execute(input: SetCompanyActiveInput): Promise<CompanyRecord> {
    if (!canManageCompanies(input.actor)) {
      throw new NotAuthorizedError("Not authorized to manage companies");
    }

    const existing = await this.deps.companyRepository.findById(input.companyId);
    if (!existing) throw new CompanyNotFoundError();

    if (input.isActive && existing.isActive) throw new CompanyAlreadyActiveError();
    if (!input.isActive && !existing.isActive) throw new CompanyAlreadyDisabledError();

    const updated = await this.deps.companyRepository.setActive(input.companyId, input.isActive);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: input.isActive ? AUDIT_ACTIONS.COMPANY_ENABLED : AUDIT_ACTIONS.COMPANY_DISABLED,
      targetEntityType: "Company",
      targetEntityId: existing.id,
    });

    return updated;
  }
}
