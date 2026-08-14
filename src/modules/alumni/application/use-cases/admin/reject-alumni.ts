import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { AlumniRecord } from "../../../domain/entities";
import { AlumniNotFoundError, AlumniNotPendingError } from "../../../domain/errors";
import type { AlumniRepository } from "../../ports/alumni-repository";

export interface RejectAlumniInput {
  actor: AuthenticatedActor;
  alumniId: string;
}

/** Deliberately never touches User.isActive — it was created false (see SignupAlumniUseCase) and a rejection must never grant access. Mirrors RejectRecruiterUseCase exactly. */
export class RejectAlumniUseCase {
  constructor(
    private readonly deps: {
      alumniRepository: AlumniRepository;
      auditRecorder: AuditRecorder;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: RejectAlumniInput): Promise<AlumniRecord> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to reject alumni accounts");
    }

    const existing = await this.deps.alumniRepository.findById(input.alumniId);
    if (!existing) throw new AlumniNotFoundError();
    if (existing.approvalStatus !== "PENDING") throw new AlumniNotPendingError();

    const updated = await this.deps.alumniRepository.setApprovalStatus(input.alumniId, "REJECTED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ALUMNI_REJECTED,
      targetEntityType: "User",
      targetEntityId: existing.userId ?? existing.id,
    });

    if (existing.userId) {
      await this.deps.notificationService.notify({
        recipientUserId: existing.userId,
        template: "ACCOUNT_SIGNUP_DECIDED",
        context: { accountType: "ALUMNI", decision: "REJECTED" },
      });
    }

    return updated;
  }
}
