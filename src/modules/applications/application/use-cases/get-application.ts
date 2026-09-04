import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { FormApplicationDetail } from "../../domain/entities";
import { FormApplicationNotFoundError } from "../../domain/errors";
import { canReviewApplication, canViewApplicationQueue } from "../../domain/permissions";
import type { ApplicationRepository } from "../ports/application-repository";

export class GetApplicationUseCase {
  constructor(private readonly deps: { applicationRepository: ApplicationRepository }) {}

  async execute(input: { actor: AuthenticatedActor; applicationId: string }): Promise<FormApplicationDetail> {
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new FormApplicationNotFoundError();
    if (input.actor.role === "SECRETARY") return application;
    if (!canViewApplicationQueue(input.actor) || !canReviewApplication(input.actor, application.reviewers, application.applicantBatchId)) {
      throw new NotAuthorizedError("Reviewer assignment and application scope are required");
    }
    return application;
  }
}
