import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { canManageMeeting } from "../../domain/permissions";
import { MeetingNotFoundError } from "../../domain/errors";
import type { MeetingRepository } from "../ports/meeting-repository";
import type { MeetingParticipantRepository } from "../ports/meeting-participant-repository";

export interface RemoveMeetingParticipantInput {
  actor: AuthenticatedActor;
  meetingId: string;
  userId: string;
}

export class RemoveMeetingParticipantUseCase {
  constructor(
    private readonly deps: {
      meetingRepository: MeetingRepository;
      meetingParticipantRepository: MeetingParticipantRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: RemoveMeetingParticipantInput): Promise<void> {
    const meeting = await this.deps.meetingRepository.findById(input.meetingId);
    if (!meeting) throw new MeetingNotFoundError();
    if (!canManageMeeting(input.actor, meeting)) {
      throw new NotAuthorizedError("Not authorized to manage this meeting's participants");
    }

    await this.deps.meetingParticipantRepository.remove(input.meetingId, input.userId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MEETING_PARTICIPANT_REMOVED,
      targetEntityType: "Meeting",
      targetEntityId: input.meetingId,
      metadata: { userId: input.userId },
    });
  }
}
