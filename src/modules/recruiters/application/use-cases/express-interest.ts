import type { AuthenticatedActor } from "@/modules/auth";
import { canAccessRecruiterDirectory } from "@/modules/auth";
import type { NotificationService } from "@/modules/notifications";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterInterestRequestRecord } from "../../domain/entities";
import type { RecruiterDirectoryRepository } from "../ports/recruiter-directory-repository";
import type { RecruiterInterestRepository } from "../ports/recruiter-interest-repository";
import type { RecruiterSelfLookup } from "../ports/recruiter-self-lookup";
import type { StudentNameLookup } from "../ports/student-name-lookup";
import { ApprovedProfileNotFoundError, RecruiterProfileNotFoundError } from "../../domain/errors";

export interface ExpressInterestInput {
  actor: AuthenticatedActor;
  studentId: string;
  message?: string;
}

/**
 * One tap, submits immediately (§8 step 4). Idempotent by design: a second
 * attempt from the same recruiter for the same student never creates a
 * second row (the unique constraint is the mechanism) — it just returns the
 * existing request so the UI can show "Interest Sent" again, never an
 * error. This is checked in application code (find-then-create) rather
 * than relying on catching a unique-constraint violation, since "already
 * sent" is an expected, common path here, not an exceptional one.
 */
export class ExpressInterestUseCase {
  constructor(
    private readonly deps: {
      directoryRepository: RecruiterDirectoryRepository;
      interestRepository: RecruiterInterestRepository;
      recruiterSelfLookup: RecruiterSelfLookup;
      studentNameLookup: StudentNameLookup;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: ExpressInterestInput): Promise<RecruiterInterestRequestRecord> {
    if (!canAccessRecruiterDirectory(input.actor)) {
      throw new NotAuthorizedError("Not authorized to express interest in students");
    }

    const profile = await this.deps.directoryRepository.findByStudentId(input.studentId);
    if (!profile) throw new ApprovedProfileNotFoundError();

    const recruiter = await this.deps.recruiterSelfLookup.findByUserId(input.actor.userId);
    if (!recruiter) throw new RecruiterProfileNotFoundError();

    const existing = await this.deps.interestRepository.findByRecruiterAndStudent(recruiter.id, input.studentId);
    if (existing) return existing;

    const created = await this.deps.interestRepository.create(recruiter.id, input.studentId, input.message?.trim() || null);

    // Only the genuinely new-creation path notifies — a repeat tap on an
    // already-sent interest returns early above and must never re-notify.
    // notify() never rejects (NFR-AVAIL-03) — safe to await without a
    // try/catch of our own.
    const studentUserId = await this.deps.studentNameLookup.findUserIdById(input.studentId);
    if (studentUserId) {
      await this.deps.notificationService.notify({
        recipientUserId: studentUserId,
        template: "RECRUITER_INTEREST_RECEIVED",
        context: { companyName: recruiter.companyName },
      });
    }

    return created;
  }
}
