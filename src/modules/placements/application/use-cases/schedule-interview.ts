import type { AuthenticatedActor } from "@/modules/auth";
import { canManageApplication } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { ApplicationRecord, InterviewMode } from "../../domain/entities";
import type { ApplicationRepository } from "../ports/application-repository";
import type { StudentEligibilityLookup } from "../ports/student-eligibility-lookup";
import { ApplicationNotFoundError, InterviewNotSchedulableError } from "../../domain/errors";
import { TERMINAL_APPLICATION_STATUSES } from "../../domain/entities";

export interface ScheduleInterviewInput {
  actor: AuthenticatedActor;
  applicationId: string;
  scheduledAt: Date;
  mode: InterviewMode;
}

/**
 * V4.0 D3 (§14, §18) — "simple date/time/mode fields on Application, no
 * calendar-sync integration." Independent of the currentStatus transition
 * rules (isValidApplicationStatusTransition) — scheduling/rescheduling an
 * interview is not itself a status change (moving to INTERVIEW is a
 * separate, explicit action via UpdateApplicationStatusUseCase) — only
 * blocked once the application has reached a terminal state, where there is
 * nothing left to schedule.
 */
export class ScheduleInterviewUseCase {
  constructor(
    private readonly deps: {
      applicationRepository: ApplicationRepository;
      studentEligibilityLookup: StudentEligibilityLookup;
    },
  ) {}

  async execute(input: ScheduleInterviewInput): Promise<ApplicationRecord> {
    const application = await this.deps.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError();

    const student = await this.deps.studentEligibilityLookup.findByStudentProfileId(application.studentProfileId);
    if (!student || !canManageApplication(input.actor, student.batchId)) {
      throw new NotAuthorizedError("Not authorized to schedule an interview for this application");
    }

    if (TERMINAL_APPLICATION_STATUSES.includes(application.currentStatus)) {
      throw new InterviewNotSchedulableError(application.currentStatus);
    }

    return this.deps.applicationRepository.scheduleInterview(input.applicationId, input.scheduledAt, input.mode);
  }
}
