import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { InternshipOutcomeRecord } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { InternshipOutcomeRepository } from "../ports/internship-outcome-repository";
import { ApplicationNotFoundError, InternshipOutcomeNotFoundError } from "../../domain/errors";

export interface SubmitStudentFeedbackInput {
  actor: AuthenticatedActor;
  applicationId: string;
  studentFeedback: string;
}

/** V4.0 D4 — self-service, own application only: the student's own account of the internship experience. */
export class SubmitStudentFeedbackUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      internshipOutcomeRepository: InternshipOutcomeRepository;
    },
  ) {}

  async execute(input: SubmitStudentFeedbackInput): Promise<InternshipOutcomeRecord> {
    if (input.actor.role !== "STUDENT" || !input.actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to submit internship feedback");
    }

    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();
    if (application.studentProfileId !== input.actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to submit feedback for this application");
    }

    const existing = await this.deps.internshipOutcomeRepository.findByApplicationId(input.applicationId);
    if (!existing) throw new InternshipOutcomeNotFoundError();

    return this.deps.internshipOutcomeRepository.setStudentFeedback(input.applicationId, input.studentFeedback);
  }
}
