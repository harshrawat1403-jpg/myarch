import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ApplicationRecord } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import { isValidApplicationStatusTransition } from "../../domain/application-lifecycle";
import { ApplicationNotFoundError, InvalidApplicationStatusTransitionError } from "../../domain/errors";
import type { PlacementDriveRepository } from "../ports/placement-drive-repository";

export interface WithdrawApplicationInput {
  actor: AuthenticatedActor;
  applicationId: string;
}

/** V4.0 D1 — self-service withdrawal, own application only, from any non-terminal state. */
export class WithdrawApplicationUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      placementDriveRepository: PlacementDriveRepository;
    },
  ) {}

  async execute(input: WithdrawApplicationInput): Promise<ApplicationRecord> {
    if (input.actor.role !== "STUDENT" || !input.actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to withdraw an application");
    }

    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();
    if (application.studentProfileId !== input.actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to withdraw this application");
    }

    const drive = await this.deps.placementDriveRepository.findById(application.placementDriveId);
    if (!drive) throw new ApplicationNotFoundError();

    if (!isValidApplicationStatusTransition(application.currentStatus, "WITHDRAWN", drive.type)) {
      throw new InvalidApplicationStatusTransitionError(application.currentStatus, "WITHDRAWN");
    }

    return this.deps.applicationRepository.transitionStatus(
      input.applicationId,
      application.currentStatus,
      "WITHDRAWN",
      input.actor.userId,
      null,
    );
  }
}
