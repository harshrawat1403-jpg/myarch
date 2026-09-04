import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { FormRecord, FormStatus } from "../../domain/entities";
import { FormNotFoundError, InvalidFormDefinitionError, InvalidFormTransitionError, PublishedFormImmutableError } from "../../domain/errors";
import { isValidFormStatusTransition } from "../../domain/lifecycle";
import { canManageForms } from "../../domain/permissions";
import type { FormRepository } from "../ports/form-repository";
import { validateFieldDefinitions } from "../validation";

export class SetFormStatusUseCase {
  constructor(private readonly deps: { formRepository: FormRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: { actor: AuthenticatedActor; formId: string; status: FormStatus }): Promise<FormRecord> {
    if (!canManageForms(input.actor)) throw new NotAuthorizedError("Not authorized to change form status");
    const existing = await this.deps.formRepository.findById(input.formId);
    if (!existing) throw new FormNotFoundError();
    if (!isValidFormStatusTransition(existing.status, input.status)) throw new InvalidFormTransitionError(existing.status, input.status);
    if (input.status === "PUBLISHED") {
      validateFieldDefinitions(existing.fields);
      if (existing.deadline && existing.deadline.getTime() < Date.now()) throw new InvalidFormDefinitionError("A form deadline must be in the future");
    }
    if (existing.status !== "DRAFT" && input.status === "PUBLISHED") throw new PublishedFormImmutableError();
    const updated = await this.deps.formRepository.setStatus(input.formId, input.status, new Date());
    const action = input.status === "PUBLISHED" ? AUDIT_ACTIONS.FORM_PUBLISHED : input.status === "CLOSED" ? AUDIT_ACTIONS.FORM_CLOSED : AUDIT_ACTIONS.FORM_ARCHIVED;
    await this.deps.auditRecorder.record({ actorUserId: input.actor.userId, action, targetEntityType: "Form", targetEntityId: updated.id });
    return updated;
  }
}

