import type { AuthenticatedActor } from "@/modules/auth";
import type { NotificationService } from "@/modules/notifications";
import { NotAuthorizedError } from "@/lib/errors";
import type { RecruiterInterestRequestRecord } from "../../domain/entities";
import type { RecruiterInterestRepository } from "../ports/recruiter-interest-repository";
import type { RecruiterAccountRepository } from "../ports/recruiter-account-repository";
import type { StudentNameLookup } from "../ports/student-name-lookup";
import type { SecretaryRecipientLookup } from "../ports/secretary-recipient-lookup";
import { InterestRequestAlreadyRespondedError, InterestRequestNotFoundError } from "../../domain/errors";

export interface RespondToInterestInput {
  actor: AuthenticatedActor;
  interestId: string;
  decision: "ACCEPT" | "DECLINE";
}

/**
 * V4.0 C3 (§7 step 7) — the student's accept/decline decision on a
 * recruiter's expressed interest. Only a SENT request may be responded to
 * (a second attempt, or responding to a request already ACCEPTED/DECLINED/
 * COMPLETED, is rejected rather than silently overwriting the first
 * decision). Acceptance never hands the recruiter's contact info to the
 * student, nor the student's contact info to the recruiter — it only
 * notifies every active Secretary to facilitate the connection per
 * department policy, which is the platform's sole intermediary role here.
 */
export class RespondToInterestUseCase {
  constructor(
    private readonly deps: {
      interestRepository: RecruiterInterestRepository;
      recruiterAccountRepository: RecruiterAccountRepository;
      studentNameLookup: StudentNameLookup;
      secretaryRecipientLookup: SecretaryRecipientLookup;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: RespondToInterestInput): Promise<RecruiterInterestRequestRecord> {
    if (input.actor.role !== "STUDENT" || !input.actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to respond to interest requests");
    }

    const request = await this.deps.interestRepository.findById(input.interestId);
    if (!request) throw new InterestRequestNotFoundError();
    if (request.studentProfileId !== input.actor.studentProfileId) {
      throw new NotAuthorizedError("Not authorized to respond to this interest request");
    }
    if (request.status !== "SENT") throw new InterestRequestAlreadyRespondedError();

    const status = input.decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    const updated = await this.deps.interestRepository.respond(input.interestId, status, new Date());

    const [recruiter, studentName] = await Promise.all([
      this.deps.recruiterAccountRepository.findById(request.recruiterProfileId),
      this.deps.studentNameLookup.findFullNameById(request.studentProfileId),
    ]);

    // notify() never rejects (NFR-AVAIL-03) — safe to await without a
    // try/catch of our own, matching every other call site in this codebase.
    // V4.0 E2: the recruiter learns the outcome either way (accept or
    // decline); the Secretary facilitation notice below stays ACCEPTED-only,
    // exactly as before — a decline needs no facilitation.
    if (recruiter) {
      await this.deps.notificationService.notify({
        recipientUserId: recruiter.userId,
        template: "RECRUITER_INTEREST_RESPONDED",
        context: { studentName: studentName ?? "A student", decision: status },
      });
    }

    if (status === "ACCEPTED") {
      const secretaryUserIds = await this.deps.secretaryRecipientLookup.listActiveSecretaryUserIds();

      await Promise.all(
        secretaryUserIds.map((recipientUserId) =>
          this.deps.notificationService.notify({
            recipientUserId,
            template: "INTEREST_FACILITATION_REQUIRED",
            context: {
              studentName: studentName ?? "A student",
              companyName: recruiter?.companyName ?? "A recruiter",
            },
          }),
        ),
      );
    }

    return updated;
  }
}
