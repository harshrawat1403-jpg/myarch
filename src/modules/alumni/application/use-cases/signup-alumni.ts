import type { IssueEmailVerificationTokenInput } from "@/modules/auth";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { AlumniRecord } from "../../domain/entities";
import { DuplicateEmailError } from "../../domain/errors";
import type { AlumniRepository } from "../ports/alumni-repository";
import type { AlumniUserProvisioner } from "../ports/alumni-user-provisioner";
import type { SecretaryRecipientLookup } from "../ports/secretary-recipient-lookup";

export interface SignupAlumniInput {
  email: string;
  fullName: string;
  graduationYear: number;
  /** Plaintext — hashed here (this.deps.hashPassword), never persisted or logged as-is. */
  password: string;
}

export interface SignupAlumniUseCaseDeps {
  alumniRepository: AlumniRepository;
  alumniUserProvisioner: AlumniUserProvisioner;
  secretaryRecipientLookup: SecretaryRecipientLookup;
  notificationService: NotificationService;
  auditRecorder: AuditRecorder;
  /** Injected — see auth's hashPassword export for why this isn't PasswordHasher/BcryptPasswordHasher imported directly. */
  hashPassword: (plaintext: string) => Promise<string>;
  /** Injected, matching SignupRecruiterUseCase's identical dependency. */
  issueEmailVerificationToken: (input: IssueEmailVerificationTokenInput) => Promise<void>;
}

/**
 * Public, unauthenticated (MYARCH Phase 1, §2.4 — ALUMNI self-signup
 * allowed, "appropriate approval/verification where required"). Mirrors
 * SignupRecruiterUseCase exactly: creates a PENDING AlumniProfile + an
 * inactive User (blocked from login until approved) in one step.
 */
export class SignupAlumniUseCase {
  constructor(private readonly deps: SignupAlumniUseCaseDeps) {}

  async execute(input: SignupAlumniInput): Promise<AlumniRecord> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.deps.hashPassword(input.password);

    let userId: string;
    try {
      const provisioned = await this.deps.alumniUserProvisioner.provisionSelfSignupAlumniUser(email, passwordHash);
      userId = provisioned.userId;
    } catch (err) {
      if (isUniqueConstraintViolation(err)) {
        throw new DuplicateEmailError(email);
      }
      throw err;
    }

    const alumni = await this.deps.alumniRepository.create({
      userId,
      fullName: input.fullName.trim(),
      graduationYear: input.graduationYear,
      approvalStatus: "PENDING",
    });

    await this.deps.auditRecorder.record({
      actorUserId: userId,
      action: AUDIT_ACTIONS.ALUMNI_CREATED,
      targetEntityType: "User",
      targetEntityId: userId,
      metadata: { alumniId: alumni.id, selfSignup: true },
    });

    await this.deps.issueEmailVerificationToken({
      email,
      recipientName: alumni.fullName,
      userId,
    });

    const secretaryUserIds = await this.deps.secretaryRecipientLookup.listActiveSecretaryUserIds();
    await Promise.all(
      secretaryUserIds.map((recipientUserId) =>
        this.deps.notificationService.notify({
          recipientUserId,
          template: "ACCOUNT_SIGNUP_PENDING_REVIEW",
          context: { accountType: "ALUMNI", applicantName: alumni.fullName },
        }),
      ),
    );

    return alumni;
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002";
}
