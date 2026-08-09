import type { AuthenticatedActor } from "@/modules/auth";
import { canDecideRegistrationRequest } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { CreateStudentInput, StudentRecord } from "@/modules/students";
import { DuplicateEmailError as StudentDuplicateEmailError, DuplicateRollNumberError as StudentDuplicateRollNumberError } from "@/modules/students";
import type { AdminResetPasswordInput, AdminResetPasswordResult } from "@/modules/auth";
import { renderEmailTemplate, type NotificationService } from "@/modules/notifications";
import type { RegistrationRequestRecord } from "../../domain/entities";
import {
  DuplicateRegistrationEmailError,
  DuplicateRegistrationRollNumberError,
  InvalidRegistrationTransitionError,
  RegistrationRequestNotFoundError,
} from "../../domain/errors";
import type { RegistrationRequestRepository } from "../ports/registration-request-repository";

const DECIDABLE_STATUSES: RegistrationRequestRecord["status"][] = ["SUBMITTED", "REVIEWED", "NEEDS_ATTENTION"];

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
}

export interface DecideRegistrationRequestUseCaseDeps {
  registrationRequestRepository: RegistrationRequestRepository;
  /** Injected rather than imported directly, so this use case stays testable against a fake — see container.ts for the real wiring. Reuses the exact CreateStudentUseCase every other student-creation path uses (§6). */
  createStudent: (input: CreateStudentInput) => Promise<StudentRecord>;
  resetPassword: (input: AdminResetPasswordInput) => Promise<AdminResetPasswordResult>;
  /** Injected the same way — see container.ts for the real `sendDirectEmail` wiring and that function's own doc comment on why this bypasses the userId-based NotificationService. */
  sendRejectionEmail: (message: { to: string; subject: string; text: string; html: string }) => Promise<void>;
  auditRecorder: AuditRecorder;
  /** V4.0 E2 — REGISTRATION_DECIDED on APPROVE, where a real account (and userId) now exists. */
  notificationService: NotificationService;
}

/**
 * Secretary-only (Q1). Approval: creates the real account via the *same*
 * CreateStudentUseCase every other student-creation path uses, then issues
 * a real reveal-once temp password via AdminResetPasswordUseCase (the
 * account-provisioner alone leaves an unrecoverable random password — see
 * PrismaUserProvisioner's own doc comment). Rejection: no account is ever
 * created (§24 "must NOT create active accounts before Secretary
 * approval"); the applicant is notified directly by email since no User
 * account exists yet to notify through the normal path (see
 * sendDirectEmail's doc comment).
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
      const rejectionContext = { applicantName: existing.fullName, decision: "REJECTED" as const, rejectionReason: updated.rejectionReason };
      const rendered = renderEmailTemplate("REGISTRATION_DECIDED", rejectionContext, existing.email);
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

    let student: StudentRecord;
    try {
      student = await this.deps.createStudent({
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
      if (err instanceof StudentDuplicateRollNumberError) throw new DuplicateRegistrationRollNumberError();
      throw err;
    }

    const { tempPassword } = await this.deps.resetPassword({
      actor: input.actor,
      targetUserId: student.userId,
      targetRole: "STUDENT",
      targetBatchId: student.batchId,
      recipientName: student.fullName,
    });

    const updated = await this.deps.registrationRequestRepository.decide(input.requestId, {
      status: "APPROVED",
      decidedByUserId: input.actor.userId,
      resultingStudentProfileId: student.id,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.REGISTRATION_REQUEST_APPROVED,
      targetEntityType: "RegistrationRequest",
      targetEntityId: existing.id,
      metadata: { resultingStudentProfileId: student.id },
    });

    // A real account now exists — REGISTRATION_DECIDED is the decision
    // outcome itself, distinct from (and delivered alongside)
    // ACCOUNT_CREDENTIALS_ISSUED, which resetPassword() above already fired
    // for the "your login is ready" concern. notify() never rejects
    // (NFR-AVAIL-03) — safe to await without a try/catch of our own.
    await this.deps.notificationService.notify({
      recipientUserId: student.userId,
      template: "REGISTRATION_DECIDED",
      context: { applicantName: student.fullName, decision: "APPROVED" },
    });

    return { request: updated, tempPassword };
  }
}
