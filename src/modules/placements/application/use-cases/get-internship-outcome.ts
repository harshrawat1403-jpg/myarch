import type { AuthenticatedActor } from "@/modules/auth";
import { canManageApplication } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { InternshipOutcomeRecord } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { InternshipOutcomeRepository } from "../ports/internship-outcome-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import { ApplicationNotFoundError, InternshipOutcomeNotFoundError } from "../../domain/errors";

export interface GetInternshipOutcomeInput {
  actor: AuthenticatedActor;
  applicationId: string;
}

/** V4.0 D4 — Secretary/Coordinator(scoped) or the owning Student. */
export class GetInternshipOutcomeUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      internshipOutcomeRepository: InternshipOutcomeRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
    },
  ) {}

  async execute(input: GetInternshipOutcomeInput): Promise<InternshipOutcomeRecord> {
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();

    if (input.actor.role === "STUDENT") {
      if (application.studentProfileId !== input.actor.studentProfileId) {
        throw new NotAuthorizedError("Not authorized to view this internship outcome");
      }
    } else {
      const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(application.studentProfileId);
      if (!student || !canManageApplication(input.actor, student.batchId)) {
        throw new NotAuthorizedError("Not authorized to view this internship outcome");
      }
    }

    const outcome = await this.deps.internshipOutcomeRepository.findByApplicationId(input.applicationId);
    if (!outcome) throw new InternshipOutcomeNotFoundError();
    return outcome;
  }
}
