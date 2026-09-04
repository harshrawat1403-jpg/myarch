import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { FormRecord, UpdateFormData } from "../../domain/entities";
import { FormCommitteeNotFoundError, FormNotFoundError, PublishedFormImmutableError } from "../../domain/errors";
import { canManageForms } from "../../domain/permissions";
import type { FormRepository } from "../ports/form-repository";
import type { CommitteeLookup } from "../ports/committee-lookup";
import { validateFieldDefinitions } from "../validation";

export interface UpdateFormInput extends UpdateFormData {
  actor: AuthenticatedActor;
  formId: string;
}

export class UpdateFormUseCase {
  constructor(private readonly deps: { formRepository: FormRepository; committeeLookup: CommitteeLookup; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdateFormInput): Promise<FormRecord> {
    if (!canManageForms(input.actor)) throw new NotAuthorizedError("Not authorized to update forms");
    const existing = await this.deps.formRepository.findById(input.formId);
    if (!existing) throw new FormNotFoundError();
    if (existing.status !== "DRAFT") throw new PublishedFormImmutableError();
    if (input.fields) validateFieldDefinitions(input.fields);
    if (input.committeeId && !(await this.deps.committeeLookup.exists(input.committeeId))) throw new FormCommitteeNotFoundError();
    const { actor, formId, ...data } = input;
    const form = await this.deps.formRepository.update(formId, data);
    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.FORM_UPDATED,
      targetEntityType: "Form",
      targetEntityId: form.id,
      metadata: { title: form.title },
    });
    return form;
  }
}
