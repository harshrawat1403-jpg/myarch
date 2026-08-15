import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { MeetingParticipantRecord, MeetingRecord } from "../../domain/entities";
import { canViewMeeting } from "../../domain/permissions";
import { MeetingNotFoundError } from "../../domain/errors";
import type { MeetingRepository } from "../ports/meeting-repository";
import type { MeetingParticipantRepository } from "../ports/meeting-participant-repository";

export interface GetMeetingInput {
  actor: AuthenticatedActor;
  meetingId: string;
}

export interface MeetingDetail {
  meeting: MeetingRecord;
  participants: MeetingParticipantRecord[];
}

export class GetMeetingUseCase {
  constructor(
    private readonly deps: { meetingRepository: MeetingRepository; meetingParticipantRepository: MeetingParticipantRepository },
  ) {}

  async execute(input: GetMeetingInput): Promise<MeetingDetail> {
    const meeting = await this.deps.meetingRepository.findById(input.meetingId);
    if (!meeting) throw new MeetingNotFoundError();

    const participants = await this.deps.meetingParticipantRepository.listForMeeting(meeting.id);
    const isParticipant = participants.some((p) => p.userId === input.actor.userId);
    if (!canViewMeeting(input.actor, meeting, isParticipant)) {
      throw new NotAuthorizedError("Not authorized to view this meeting");
    }

    return { meeting, participants };
  }
}
