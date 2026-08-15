import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { MeetingParticipantRecord } from "../../domain/entities";
import { canManageMeeting } from "../../domain/permissions";
import { DuplicateMeetingParticipantError, MeetingNotFoundError } from "../../domain/errors";
import type { MeetingRepository } from "../ports/meeting-repository";
import type { MeetingParticipantRepository } from "../ports/meeting-participant-repository";

export interface AddMeetingParticipantInput {
  actor: AuthenticatedActor;
  meetingId: string;
  userId: string;
}

export class AddMeetingParticipantUseCase {
  constructor(
    private readonly deps: {
      meetingRepository: MeetingRepository;
      meetingParticipantRepository: MeetingParticipantRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(input: AddMeetingParticipantInput): Promise<MeetingParticipantRecord> {
    const meeting = await this.deps.meetingRepository.findById(input.meetingId);
    if (!meeting) throw new MeetingNotFoundError();
    if (!canManageMeeting(input.actor, meeting)) {
      throw new NotAuthorizedError("Not authorized to manage this meeting's participants");
    }

    const existing = await this.deps.meetingParticipantRepository.findByMeetingAndUser(input.meetingId, input.userId);
    if (existing) throw new DuplicateMeetingParticipantError();

    const participant = await this.deps.meetingParticipantRepository.add(input.meetingId, input.userId);

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.MEETING_PARTICIPANT_ADDED,
      targetEntityType: "Meeting",
      targetEntityId: input.meetingId,
      metadata: { userId: input.userId },
    });

    return participant;
  }
}
