import type { IssueEmailVerificationTokenInput } from "@/modules/auth";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { RecruiterAccountRecord } from "../../domain/entities";
import { DuplicateEmailError } from "../../domain/errors";
import type { RecruiterAccountRepository } from "../ports/recruiter-account-repository";
import type { RecruiterUserProvisioner } from "../ports/recruiter-user-provisioner";
import type { SecretaryRecipientLookup } from "../ports/secretary-recipient-lookup";

export interface SignupRecruiterInput {
  email: string;
  fullName: string;
  companyName: string;
  /** Plaintext — hashed here (this.deps.hashPassword), never persisted or logged as-is. */
  password: string;
}

export interface SignupRecruiterUseCaseDeps {
  recruiterAccountRepository: RecruiterAccountRepository;
  recruiterUserProvisioner: RecruiterUserProvisioner;
  secretaryRecipientLookup: SecretaryRecipientLookup;
  notificationService: NotificationService;
  auditRecorder: AuditRecorder;
  /** Injected — see auth's hashPassword export for why this isn't PasswordHasher/BcryptPasswordHasher imported directly. */
  hashPassword: (plaintext: string) => Promise<string>;
  /** Injected, matching SubmitRegistrationRequestUseCase's identical dependency. */
  issueEmailVerificationToken: (input: IssueEmailVerificationTokenInput) => Promise<void>;
}

/**
 * Public, unauthenticated (roadmap §2.4 — RECRUITER self-signup allowed,
 * admin approval required before access). Creates a PENDING RecruiterProfile
 * + an inactive User (blocked from login until approved) in one step, then
 * reuses the EXISTING ApproveRecruiterUseCase/RejectRecruiterUseCase
 * entirely unchanged — those use cases were built "dormant until a future
 * phase's public signup flow ever inserts a PENDING row" (see
 * ApproveRecruiterUseCase's own doc comment); this is that phase.
 */
export class SignupRecruiterUseCase {
  constructor(private readonly deps: SignupRecruiterUseCaseDeps) {}

  async execute(input: SignupRecruiterInput): Promise<RecruiterAccountRecord> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.deps.hashPassword(input.password);

    let userId: string;
    try {
      const provisioned = await this.deps.recruiterUserProvisioner.provisionSelfSignupRecruiterUser(
        email,
        passwordHash,
      );
      userId = provisioned.userId;
    } catch (err) {
      if (isUniqueConstraintViolation(err)) {
        throw new DuplicateEmailError(email);
      }
      throw err;
    }

    const recruiter = await this.deps.recruiterAccountRepository.create({
      userId,
      fullName: input.fullName.trim(),
      companyName: input.companyName.trim(),
      approvalStatus: "PENDING",
    });

    await this.deps.auditRecorder.record({
      actorUserId: userId,
      action: AUDIT_ACTIONS.RECRUITER_CREATED,
      targetEntityType: "User",
      targetEntityId: userId,
      metadata: { recruiterId: recruiter.id, selfSignup: true },
    });

    await this.deps.issueEmailVerificationToken({
      email,
      recipientName: recruiter.fullName,
      userId,
    });

    const secretaryUserIds = await this.deps.secretaryRecipientLookup.listActiveSecretaryUserIds();
    await Promise.all(
      secretaryUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "ACCOUNT_SIGNUP_PENDING_REVIEW",
          context: { accountType: "RECRUITER", applicantName: recruiter.fullName },
        }),
      ),
    );

    return recruiter;
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002";
}
