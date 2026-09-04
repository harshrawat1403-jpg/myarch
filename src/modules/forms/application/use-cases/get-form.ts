import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { FormRecord } from "../../domain/entities";
import { FormNotFoundError } from "../../domain/errors";
import { canViewForms } from "../../domain/permissions";
import { isFormAvailable } from "../../domain/lifecycle";
import type { FormRepository } from "../ports/form-repository";

export class GetFormUseCase {
  constructor(private readonly deps: { formRepository: FormRepository }) {}

  async execute(input: { actor: AuthenticatedActor; formId: string; availableOnly?: boolean }): Promise<FormRecord> {
    if (!canViewForms(input.actor)) throw new NotAuthorizedError("Not authorized to view forms");
    const form = await this.deps.formRepository.findById(input.formId);
    if (!form) throw new FormNotFoundError();
    if (input.availableOnly && (!isFormAvailable(form) || input.actor.role !== "STUDENT")) throw new FormNotFoundError();
    return form;
  }
}

