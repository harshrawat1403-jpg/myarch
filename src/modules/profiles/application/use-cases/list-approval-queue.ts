import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ApprovalQueueItem } from "../../domain/entities";
import type { ProfileDraftRepository } from "../ports/profile-draft-repository";

export interface ListApprovalQueueInput {
  actor: AuthenticatedActor;
}

/** "Coordinators and Secretary review submissions" — the approval queue. */
export class ListApprovalQueueUseCase {
  constructor(private readonly deps: { profileDraftRepository: ProfileDraftRepository }) {}

  async execute(input: ListApprovalQueueInput): Promise<ApprovalQueueItem[]> {
    if (input.actor.role === "SECRETARY") {
      return this.deps.profileDraftRepository.listPendingReview({});
    }

    if (input.actor.role === "COORDINATOR") {
      const scope = input.actor.batchScope ?? [];
      if (scope.length === 0) return [];
      return this.deps.profileDraftRepository.listPendingReview({ batchIds: scope });
    }

    throw new NotAuthorizedError("Not authorized to view the approval queue");
  }
}
