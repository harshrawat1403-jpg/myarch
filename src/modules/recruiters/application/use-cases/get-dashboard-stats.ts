import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterDashboardStats } from "../../domain/entities";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";

export interface GetDashboardStatsInput {
  actor: AuthenticatedActor;
}

export class GetDashboardStatsUseCase {
  constructor(private readonly deps: { directoryRepository: RecruiterDirectoryRepository }) {}

  async execute(input: GetDashboardStatsInput): Promise<RecruiterDashboardStats> {
    if (!canAccessRecruiterDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to view recruiter dashboard statistics");
    }

    return this.deps.directoryRepository.getDashboardStats();
  }
}
