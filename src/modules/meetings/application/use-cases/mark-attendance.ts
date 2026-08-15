import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MeetingParticipantRecord } from "../../domain/entities";
import { canManageMeeting } from "../../domain/permissions";
import { MeetingNotFoundError } from "../../domain/errors";
import type { MeetingRepository } from "../ports/meeting-repository";
import type { MeetingParticipantRepository } from "../ports/meeting-participant-repository";

export interface MarkMeetingAttendanceInput {
  actor: AuthenticatedActor;
  meetingId: string;
  userId: string;
  attended: boolean;
}

export class MarkMeetingAttendanceUseCase {
  constructor(
    private readonly deps: {
      meetingRepository: MeetingRepository;
      meetingParticipantRepository: MeetingParticipantRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: MarkMeetingAttendanceInput): Promise<MeetingParticipantRecord> {
    const meeting = await this.deps.meetingRepository.findById(input.meetingId);
    if (!meeting) throw new MeetingNotFoundError();
    if (!canManageMeeting(input.actor, meeting)) {
      throw new NotAuthorizedError("Not authorized to mark attendance for this meeting");
    }

    const updated = await this.deps.meetingParticipantRepository.setAttended(input.meetingId, input.userId, input.attended);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MEETING_ATTENDANCE_MARKED,
      targetEntityType: "Meeting",
      targetEntityId: input.meetingId,
      metadata: { userId: input.userId, attended: input.attended },
    });

    return updated;
  }
}
