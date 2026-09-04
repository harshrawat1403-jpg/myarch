import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ApplicationFilters, FormApplicationSummary } from "../../domain/entities";
import { canViewApplicationQueue } from "../../domain/permissions";
import type { ApplicationRepository } from "../ports/application-repository";

export class SearchApplicationsUseCase {
  constructor(private readonly deps: { applicationRepository: ApplicationRepository }) {}

  async execute(input: { actor: AuthenticatedActor; filters: ApplicationFilters }): Promise<readonly FormApplicationSummary[]> {
    if (!canViewApplicationQueue(input.actor)) throw new NotAuthorizedError("Not authorized to view applications");
    const results = await this.deps.applicationRepository.search(input.filters);
    if (input.actor.role === "SECRETARY") return results;
    const scope = input.actor.batchScope ?? [];
    return results.filter((application) => scope.includes(application.applicantBatchId));
  }
}
