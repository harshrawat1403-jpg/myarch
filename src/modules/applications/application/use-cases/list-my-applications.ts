import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { FormApplicationSummary } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";

export class ListMyApplicationsUseCase {
  constructor(private readonly deps: { applicationRepository: ApplicationRepository }) {}

  async execute(input: { actor: AuthenticatedActor }): Promise<readonly FormApplicationSummary[]> {
    if (input.actor.role !== "STUDENT" || !input.actor.studentProfileId) {
      throw new NotAuthorizedError("Only students may view their applications");
    }
    return this.deps.applicationRepository.listForApplicant(input.actor.userId);
  }
}
