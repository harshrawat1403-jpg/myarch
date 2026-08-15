import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MeetingRecord } from "../../domain/entities";
import { canManageMeeting } from "../../domain/permissions";
import { isValidMeetingTransition } from "../../domain/lifecycle";
import { InvalidMeetingTransitionError, MeetingNotFoundError } from "../../domain/errors";
import type { MeetingRepository } from "../ports/meeting-repository";

export interface CancelMeetingInput {
  actor: AuthenticatedActor;
  meetingId: string;
}

export class CancelMeetingUseCase {
  constructor(private readonly deps: { meetingRepository: MeetingRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: CancelMeetingInput): Promise<MeetingRecord> {
    const existing = await this.deps.meetingRepository.findById(input.meetingId);
    if (!existing) throw new MeetingNotFoundError();
    if (!canManageMeeting(input.actor, existing)) {
      throw new NotAuthorizedError("Not authorized to cancel this meeting");
    }
    if (!isValidMeetingTransition(existing.status, "CANCELLED")) {
      throw new InvalidMeetingTransitionError(existing.status, "CANCELLED");
    }

    const updated = await this.deps.meetingRepository.setStatus(input.meetingId, "CANCELLED");

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MEETING_CANCELLED,
      targetEntityType: "Meeting",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
