import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { NotificationService } from "@/modules/notifications";
import type { AlumniRecord } from "../../../domain/entities";
import { AlumniNotFoundError, AlumniNotPendingError } from "../../../domain/errors";
import type { AlumniRepository } from "../../ports/alumni-repository";

export interface ApproveAlumniInput {
  actor: AuthenticatedActor;
  alumniId: string;
}

/**
 * Operates only on a PENDING account — today, exclusively a self-signed-up
 * one (MYARCH Phase 1, §2.4); admin-created directory rows default to
 * APPROVED, so they never reach this path. Mirrors ApproveRecruiterUseCase
 * exactly. Secretary-only — unlike the rest of this module's CRUD
 * (canManageAlumni, Coordinator-inclusive), account approval is an
 * administrative decision, not directory maintenance.
 */
export class ApproveAlumniUseCase {
  constructor(
    private readonly deps: {
      alumniRepository: AlumniRepository;
      auditRecorder: AuditRecorder;
      notificationService: NotificationService;
    },
  ) {}

  async execute(input: ApproveAlumniInput): Promise<AlumniRecord> {
    if (input.actor.role !== "SECRETARY") {
      throw new NotAuthorizedError("Not authorized to approve alumni accounts");
    }

    const existing = await this.deps.alumniRepository.findById(input.alumniId);
    if (!existing) throw new AlumniNotFoundError();
    if (existing.approvalStatus !== "PENDING") throw new AlumniNotPendingError();

    const updated = await this.deps.alumniRepository.approveAndActivate(input.alumniId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ALUMNI_APPROVED,
      targetEntityType: "User",
      targetEntityId: existing.userId ?? existing.id,
    });

    if (existing.userId) {
      await this.deps.notificationService.notify({
        recipientUserId: existing.userId,
        template: "ACCOUNT_SIGNUP_DECIDED",
        context: { accountType: "ALUMNI", decision: "APPROVED" },
      });
    }

    return updated;
  }
}
