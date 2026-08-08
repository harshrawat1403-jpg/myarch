import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterAccountRecord } from "../../../domain/entities";
import { RecruiterAccountNotFoundError } from "../../../domain/errors";
import type { RecruiterAccountRepository } from "../../ports/recruiter-account-repository";

export interface GetRecruiterAccountInput {
  actor: AuthenticatedActor;
  recruiterId: string;
}

export class GetRecruiterAccountUseCase {
  constructor(private readonly deps: { recruiterAccountRepository: RecruiterAccountRepository }) {}

  async execute(input: GetRecruiterAccountInput): Promise<RecruiterAccountRecord> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to view recruiter accounts");
    }
    const recruiter = await this.deps.recruiterAccountRepository.findById(input.recruiterId);
    if (!recruiter) throw new RecruiterAccountNotFoundError();
    return recruiter;
  }
}
