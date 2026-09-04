import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { StudentFormApplicationView } from "../../domain/entities";
import { FormApplicationNotFoundError } from "../../domain/errors";
import { canViewOwnApplication } from "../../domain/permissions";
import type { ApplicationRepository } from "../ports/application-repository";

export class GetMyApplicationUseCase {
  constructor(private readonly deps: { applicationRepository: ApplicationRepository }) {}

  async execute(input: { actor: AuthenticatedActor; applicationId: string }): Promise<StudentFormApplicationView> {
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new FormApplicationNotFoundError();
    if (!canViewOwnApplication(input.actor, application.applicantUserId)) {
      throw new NotAuthorizedError("Students may only view their own applications");
    }
    return {
      id: application.id,
      submissionId: application.submissionId,
      formId: application.formId,
      applicantUserId: application.applicantUserId,
      studentProfileId: application.studentProfileId,
      currentStatus: application.currentStatus,
      decisionReason: application.decisionReason,
      decidedByUserId: application.decidedByUserId,
      decidedAt: application.decidedAt,
      submittedAt: application.submittedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      formTitle: application.formTitle,
      fields: application.fields,
      answers: application.answers,
      statusEvents: application.statusEvents.map(({ id, fromStatus, toStatus, occurredAt }) => ({ id, fromStatus, toStatus, occurredAt })),
    };
  }
}
