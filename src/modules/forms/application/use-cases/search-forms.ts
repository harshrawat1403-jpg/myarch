import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { FormFilters, FormRecord } from "../../domain/entities";
import { canViewForms } from "../../domain/permissions";
import { isFormAvailable } from "../../domain/lifecycle";
import type { FormRepository } from "../ports/form-repository";

export class SearchFormsUseCase {
  constructor(private readonly deps: { formRepository: FormRepository }) {}

  async execute(input: { actor: AuthenticatedActor; filters: FormFilters; availableOnly?: boolean }): Promise<readonly FormRecord[]> {
    if (!canViewForms(input.actor)) throw new NotAuthorizedError("Not authorized to view forms");
    const forms = await this.deps.formRepository.search({
      ...input.filters,
      // Core Committee owns its selection flow and its linked form is an
      // implementation detail. Administrative lists deliberately retain it.
      ...(input.availableOnly && input.actor.role === "STUDENT"
        ? { excludeCoreCommitteeSelectionForms: true }
        : {}),
    });
    return input.availableOnly ? forms.filter((form) => isAvailableForStudent(form, input.actor.role)) : forms;
  }
}

function isAvailableForStudent(form: FormRecord, role: AuthenticatedActor["role"]): boolean {
  return role === "STUDENT" && isFormAvailable(form);
}
