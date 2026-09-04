import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CreateFormData, FormRecord } from "../../domain/entities";
import { FormCommitteeNotFoundError } from "../../domain/errors";
import { canManageForms } from "../../domain/permissions";
import type { FormRepository } from "../ports/form-repository";
import type { CommitteeLookup } from "../ports/committee-lookup";
import { validateFieldDefinitions } from "../validation";

export interface CreateFormInput extends Omit<CreateFormData, "createdByUserId"> {
  actor: AuthenticatedActor;
}

export class CreateFormUseCase {
  constructor(private readonly deps: { formRepository: FormRepository; committeeLookup: CommitteeLookup; auditRecorder: AuditRecorder }) {}

  async execute(input: CreateFormInput): Promise<FormRecord> {
    if (!canManageForms(input.actor)) throw new NotAuthorizedError("Not authorized to create forms");
    validateFieldDefinitions(input.fields);
    if (input.committeeId && !(await this.deps.committeeLookup.exists(input.committeeId))) {
      throw new FormCommitteeNotFoundError();
    }
    const { actor, ...data } = input;
    const form = await this.deps.formRepository.create({ ...data, createdByUserId: actor.userId });
    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.FORM_CREATED,
      targetEntityType: "Form",
      targetEntityId: form.id,
      metadata: { title: form.title },
    });
    return form;
  }
}
