import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterAccountRecord, RecruiterAccountSearchFilters } from "../../../domain/entities";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";

export interface SearchRecruiterAccountsInput {
  actor: AuthenticatedActor;
  filters: RecruiterAccountSearchFilters;
}

export class SearchRecruiterAccountsUseCase {
  constructor(private readonly deps: { recruiterAccountRepository: RecruiterAccountRepository }) {}

  async execute(input: SearchRecruiterAccountsInput): Promise<RecruiterAccountRecord[]> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to view recruiter accounts");
    }
    return this.deps.recruiterAccountRepository.search(input.filters);
  }
}
