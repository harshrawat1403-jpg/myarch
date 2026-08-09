import type { AuthenticatedActor } from "@/modules/auth";
import { canManageApplication } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ApplicationRecord } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import { ApplicationNotFoundError } from "../../domain/errors";

export interface GetApplicationInput {
  actor: AuthenticatedActor;
  applicationId: string;
}

/** V4.0 D1 — Secretary/Coordinator(scoped to the applying student's batch) or the owning Student. */
export class GetApplicationUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
    },
  ) {}

  async execute(input: GetApplicationInput): Promise<ApplicationRecord> {
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();

    if (input.actor.role === "STUDENT") {
      if (application.studentProfileId !== input.actor.studentProfileId) {
        throw new NotAuthorizedError("Not authorized to view this application");
      }
      return application;
    }

    const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(application.studentProfileId);
    if (!student || !canManageApplication(input.actor, student.batchId)) {
      throw new NotAuthorizedError("Not authorized to view this application");
    }

    return application;
  }
}
