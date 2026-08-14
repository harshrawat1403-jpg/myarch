import type { BatchLookup } from "@/lib/batch-lookup";
import type { NotificationService } from "@/modules/notifications";
import type { IssueEmailVerificationTokenInput } from "@/modules/auth";
import type { RegistrationRequestRecord, RegistrationSubmittedData } from "../../domain/entities";
import {
  DuplicateRegistrationEmailError,
  DuplicateRegistrationRollNumberError,
  RegistrationBatchNotFoundError,
  RegistrationBatchNotOpenError,
} from "../../domain/errors";
import type { RegistrationRequestRepository } from "../ports/registration-request-repository";
import type { ExistingAccountLookup } from "../ports/existing-account-lookup";
import type { RegistrationReviewerLookup } from "../ports/registration-reviewer-lookup";

export interface SubmitRegistrationRequestInput {
  email: string;
  fullName: string;
  rollNumber: string;
  batchId: string;
  submittedData?: RegistrationSubmittedData;
}

export interface SubmitRegistrationRequestUseCaseDeps {
  registrationRequestRepository: RegistrationRequestRepository;
  batchLookup: BatchLookup;
  existingAccountLookup: ExistingAccountLookup;
  reviewerLookup: RegistrationReviewerLookup;
  notificationService: NotificationService;
  /** MYARCH Phase 1 (§2.4) — injected rather than importing auth's use case directly, matching this module's existing dependency-injection convention for every other cross-module primitive (runApproveTransaction, sendRejectionEmail, ...). */
  issueEmailVerificationToken: (input: IssueEmailVerificationTokenInput) => Promise<void>;
}

/**
 * Public, unauthenticated (§7 step 2 — no `actor`, unlike every other
 * create-use-case in this codebase). Validation rigor mirrors
 * CreateStudentUseCase exactly per §18 point 6: real batch existence/status
 * check (ACTIVE only — a stricter requirement than CreateStudentUseCase's
 * own "not ARCHIVED", since this is for prospective/incoming students, not
 * staff backfilling an existing roster), and duplicate checks against both
 * real accounts and other still-pending applications.
 */
export class SubmitRegistrationRequestUseCase {
  constructor(private readonly deps: SubmitRegistrationRequestUseCaseDeps) {}

  async execute(input: SubmitRegistrationRequestInput): Promise<RegistrationRequestRecord> {
    const batch = await this.deps.batchLookup.findById(input.batchId);
    if (!batch) throw new RegistrationBatchNotFoundError();
    if (batch.status !== "ACTIVE") throw new RegistrationBatchNotOpenError();

    const email = input.email.trim().toLowerCase();
    const rollNumber = input.rollNumber.trim();

    const [emailTaken, pendingEmail] = await Promise.all([
      this.deps.existingAccountLookup.emailInUse(email),
      this.deps.registrationRequestRepository.hasPendingByEmail(email),
    ]);
    if (emailTaken || pendingEmail) throw new DuplicateRegistrationEmailError();

    const [rollNumberTaken, pendingRollNumber] = await Promise.all([
      this.deps.existingAccountLookup.rollNumberInUse(rollNumber),
      this.deps.registrationRequestRepository.hasPendingByRollNumber(rollNumber),
    ]);
    if (rollNumberTaken || pendingRollNumber) throw new DuplicateRegistrationRollNumberError();

    const created = await this.deps.registrationRequestRepository.create({
      email,
      fullName: input.fullName.trim(),
      rollNumber,
      batchId: input.batchId,
      submittedData: input.submittedData ?? {},
    });

    // MYARCH Phase 1 (§2.4) — the applicant must verify this email before
    // a Secretary can approve the request (DecideRegistrationRequestUseCase
    // enforces this). IssueEmailVerificationTokenUseCase already swallows
    // its own email-delivery failure internally (so a mail-provider outage
    // never blocks the submission) — a throw here would only ever be a
    // genuine token-persistence (database) failure, which should propagate
    // rather than be silently hidden.
    await this.deps.issueEmailVerificationToken({
      email,
      recipientName: created.fullName,
      registrationRequestId: created.id,
    });

    // notify() never rejects (NFR-AVAIL-03) — safe to await without a
    // try/catch of our own, matching every other call site in this codebase.
    const reviewerUserIds = await this.deps.reviewerLookup.listReviewerUserIds(input.batchId);
    await Promise.all(
      reviewerUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "REGISTRATION_SUBMITTED",
          context: { applicantName: created.fullName, batchName: batch.name, requestId: created.id },
        }),
      ),
    );

    return created;
  }
}
