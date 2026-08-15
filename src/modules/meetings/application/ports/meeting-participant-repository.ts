import type { MeetingParticipantRecord } from "../../domain/entities";

export interface MeetingParticipantRepository {
  add(meetingId: string, userId: string): Promise<MeetingParticipantRecord>;
  remove(meetingId: string, userId: string): Promise<void>;
  setAttended(meetingId: string, userId: string, attended: boolean): Promise<MeetingParticipantRecord>;
  findByMeetingAndUser(meetingId: string, userId: string): Promise<MeetingParticipantRecord | null>;
  listForMeeting(meetingId: string): Promise<MeetingParticipantRecord[]>;
}
