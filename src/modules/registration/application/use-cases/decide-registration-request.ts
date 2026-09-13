import type { AuthenticatedActor } from "@/modules/auth";
import { canDecideRegistrationRequest } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CreateStudentInput, StudentRecord } from "@/modules/students";
import {
  DuplicateEmailError as StudentDuplicateEmailError,
  DuplicateRollNumberError as StudentDuplicateRollNumberError,
} from "@/modules/students";
import type { AdminResetPasswordInput, AdminResetPasswordResult } from "@/modules/auth";
import {
  renderEmailTemplate,
  type NotificationRequest,
  type NotificationService,
} from "@/modules/notifications";
import type { RegistrationRequestRecord } from "../../domain/entities";
import {
  DuplicateRegistrationEmailError,
  DuplicateRegistrationRollNumberError,
  InvalidRegistrationTransitionError,
  RegistrationRequestNotFoundError,
} from "../../domain/errors";
import type { RegistrationRequestRepository } from "../ports/registration-request-repository";

const DECIDABLE_STATUSES: RegistrationRequestRecord["status"][] = [
  "SUBMITTED",
  "REVIEWED",
  "NEEDS_ATTENTION",
];

export interface DecideRegistrationRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
  decision: "APPROVE" | "REJECT";
  /** Required when decision is REJECT. */
  rejectionReason?: string;
}

export interface DecideRegistrationRequestResult {
  request: RegistrationRequestRecord;
  /** Plaintext — reveal-once. Only present on APPROVE. */
  tempPassword?: string;
  /** Only present on APPROVE. Account creation succeeds even if delivery fails. */
  credentialsEmailSent?: boolean;
}

/**
 * The context handed to the APPROVE-path transaction callback below — the
 * same three operations the old, unwrapped code called directly, now bound
 * to one transaction's Prisma client so they commit or roll back together.
 */
export interface ApproveRegistrationTransactionContext {
  createStudent: (input: CreateStudentInput) => Promise<StudentRecord>;
  resetPassword: (input: AdminResetPasswordInput) => Promise<AdminResetPasswordResult>;
  registrationRequestRepository: RegistrationRequestRepository;
  auditRecorder: AuditRecorder;
}

export interface DecideRegistrationRequestUseCaseDeps {
  registrationRequestRepository: RegistrationRequestRepository;
  /**
   * Runs the APPROVE path's writes — create the student account, reset its
   * password, mark the request decided, and record the approval audit
   * entry — as one atomic Prisma transaction, so a mid-sequence failure
   * never leaves an orphaned account behind a request stuck re-decidable
   * (the bug this replaces: three separate, unwrapped writes). Injected
   * rather than opened directly here, so this use case stays testable
   * against a fake — see container.ts for the real `prisma.$transaction`
   * wiring, which also builds transaction-scoped instances of the exact
   * CreateStudentUseCase/AdminResetPasswordUseCase every other
   * account-creation/password-reset path uses (§6).
   *
   * Any notification requests raised *during* the transaction (concretely:
   * resetPassword's ACCOUNT_CREDENTIALS_ISSUED) are captured rather than
   * sent, and returned here for replay only once the transaction has
   * actually committed — see the notify() calls at the end of execute().
   */
  runApproveTransaction: <T>(
    fn: (ctx: ApproveRegistrationTransactionContext) => Promise<T>,
  ) => Promise<{ result: T; deferredNotifications: NotificationRequest[] }>;
  /** Injected the same way — see container.ts for the real `sendDirectEmail` wiring and that function's own doc comment on why this bypasses the userId-based NotificationService. */
  sendRejectionEmail: (message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<void>;
  /** Direct-only, secret-bearing mail sent after the approval transaction commits. */
  sendAccountCredentialsEmail: (input: {
    recipientName: string;
    recipientEmail: string;
    temporaryPassword: string;
  }) => Promise<boolean>;
  auditRecorder: AuditRecorder;
  /** V4.0 E2 — REGISTRATION_DECIDED on APPROVE, where a real account (and userId) now exists. */
  notificationService: NotificationService;
}

/**
 * Secretary-only (Q1). Approval: creates the real account via the *same*
 * CreateStudentUseCase every other student-creation path uses, then issues
 * a real reveal-once temp password via AdminResetPasswordUseCase (the
 * account-provisioner alone leaves an unrecoverable random password — see
 * PrismaUserProvisioner's own doc comment) — both, plus marking the request
 * decided, inside one atomic transaction (runApproveTransaction) so a
 * mid-sequence failure can never leave a real account behind a request
 * that's still stuck pending. Rejection: no account is ever created (§24
 * "must NOT create active accounts before Secretary approval"); the
 * applicant is notified directly by email since no User account exists yet
 * to notify through the normal path (see sendDirectEmail's doc comment).
 */
export class DecideRegistrationRequestUseCase {
  constructor(private readonly deps: DecideRegistrationRequestUseCaseDeps) {}

  async execute(input: DecideRegistrationRequestInput): Promise<DecideRegistrationRequestResult> {
    if (!canDecideRegistrationRequest(input.actor)) {
      throw new NotAuthorizedError("Not authorized to decide registration requests");
    }

    const existing = await this.deps.registrationRequestRepository.findById(input.requestId);
    if (!existing) throw new RegistrationRequestNotFoundError();
    if (!DECIDABLE_STATUSES.includes(existing.status)) {
      throw new InvalidRegistrationTransitionError("This request has already been decided");
    }

    if (input.decision === "REJECT") {
      if (!input.rejectionReason?.trim()) {
        throw new InvalidRegistrationTransitionError("A rejection reason is required");
      }
      const updated = await this.deps.registrationRequestRepository.decide(input.requestId, {
        status: "REJECTED",
        decidedByUserId: input.actor.userId,
        rejectionReason: input.rejectionReason.trim(),
      });

      // V4.0 E2: renders the same REGISTRATION_DECIDED template the APPROVE
      // branch's real notify() call uses below — one template, two delivery
      // paths, rather than this branch keeping its own hand-written email
      // text that could drift from the approved-path wording over time.
      const rejectionContext = {
        applicantName: existing.fullName,
        decision: "REJECTED" as const,
        rejectionReason: updated.rejectionReason,
      };
      const rendered = renderEmailTemplate(
        "REGISTRATION_DECIDED",
        rejectionContext,
        existing.email,
      );
      await this.deps.sendRejectionEmail(rendered).catch(() => {
        // Best-effort — a delivery failure must never block a decision that
        // has already been persisted, matching AdminResetPasswordUseCase's
        // own notify().catch() precedent.
      });

      await this.deps.auditRecorder.record({
        actorUserId: input.actor.userId,
        action: AUDIT_ACTIONS.REGISTRATION_REQUEST_REJECTED,
        targetEntityType: "RegistrationRequest",
        targetEntityId: existing.id,
      });

      return { request: updated };
    }

    // Create the student account, reset its password, and mark the request
    // decided — atomically. If any step fails (including a duplicate-email/
    // roll-number collision), Prisma rolls back everything above, so we
    // never end up with a real account and a request that's still stuck
    // "pending" (the bug this replaces).
    const { result, deferredNotifications } = await this.deps.runApproveTransaction(async (ctx) => {
      let txStudent: StudentRecord;
      try {
        txStudent = await ctx.createStudent({
          actor: input.actor,
          email: existing.email,
          fullName: existing.fullName,
          rollNumber: existing.rollNumber,
          batchId: existing.batchId,
          private: {
            phone: existing.submittedData.phone,
            personalEmail: existing.submittedData.personalEmail,
          },
        });
      } catch (err) {
        if (err instanceof StudentDuplicateEmailError) throw new DuplicateRegistrationEmailError();
        if (err instanceof StudentDuplicateRollNumberError)
          throw new DuplicateRegistrationRollNumberError();
        throw err;
      }

      const { tempPassword: txTempPassword } = await ctx.resetPassword({
        actor: input.actor,
        targetUserId: txStudent.userId,
        targetRole: "STUDENT",
        targetBatchId: txStudent.batchId,
        recipientName: txStudent.fullName,
      });

      const txUpdated = await ctx.registrationRequestRepository.decide(input.requestId, {
        status: "APPROVED",
        decidedByUserId: input.actor.userId,
        resultingStudentProfileId: txStudent.id,
      });

      await ctx.auditRecorder.record({
        actorUserId: input.actor.userId,
        action: AUDIT_ACTIONS.REGISTRATION_REQUEST_APPROVED,
        targetEntityType: "RegistrationRequest",
        targetEntityId: existing.id,
        metadata: {
          resultingStudentProfileId: txStudent.id,
          emailVerifiedAtApproval: existing.emailVerifiedAt !== null,
        },
      });

      return { student: txStudent, tempPassword: txTempPassword, updated: txUpdated };
    });

    const { student, tempPassword, updated } = result;

    // Only now that everything above has actually committed do we send any
    // notification — replaying whatever the transaction deferred (in
    // practice, resetPassword's ACCOUNT_CREDENTIALS_ISSUED), followed by
    // REGISTRATION_DECIDED, the decision outcome itself. notify() never
    // rejects (NFR-AVAIL-03) — safe to await without a try/catch of our own.
    for (const deferred of deferredNotifications) {
      await this.deps.notificationService.notify(deferred);
    }
    await this.deps.notificationService.notify({
      recipientUserId: student.userId,
      template: "REGISTRATION_DECIDED",
      context: { applicantName: student.fullName, decision: "APPROVED" },
    });

    // The database transaction has committed. A provider outage must not
    // undo the account, password reset, approval audit, or notification
    // history that is already durable.
    const credentialsEmailSent = await this.deps
      .sendAccountCredentialsEmail({
        recipientName: student.fullName,
        recipientEmail: existing.email,
        temporaryPassword: tempPassword,
      })
      .catch(() => false);

    return { request: updated, tempPassword, credentialsEmailSent };
  }
}
