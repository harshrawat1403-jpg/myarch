import type { AuthenticatedActor } from "@/modules/auth";
import { canManageApplication } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { InternshipOutcomeRecord } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { InternshipOutcomeRepository } from "../ports/internship-outcome-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import { ApplicationNotFoundError, InternshipOutcomeNotFoundError } from "../../domain/errors";

export interface UpdateInternshipOutcomeInput {
  actor: AuthenticatedActor;
  applicationId: string;
  companyFeedback: string;
}

/** V4.0 D4 — Secretary/Coordinator(scoped to the applying student's batch) records feedback received from the company, offline. */
export class UpdateInternshipOutcomeUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      internshipOutcomeRepository: InternshipOutcomeRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
    },
  ) {}

  async execute(input: UpdateInternshipOutcomeInput): Promise<InternshipOutcomeRecord> {
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();

    const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(application.studentProfileId);
    if (!student || !canManageApplication(input.actor, student.batchId)) {
      throw new NotAuthorizedError("Not authorized to update this internship outcome");
    }

    const existing = await this.deps.internshipOutcomeRepository.findByApplicationId(input.applicationId);
    if (!existing) throw new InternshipOutcomeNotFoundError();

    return this.deps.internshipOutcomeRepository.setCompanyFeedback(input.applicationId, input.companyFeedback);
  }
}
