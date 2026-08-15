import type { PrismaClient } from "@prisma/client";
import type { MeetingParticipantRecord } from "../domain/entities";
import type { MeetingParticipantRepository } from "../application/ports/meeting-participant-repository";

export class PrismaMeetingParticipantRepository implements MeetingParticipantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(meetingId: string, userId: string): Promise<MeetingParticipantRecord> {
    return this.prisma.meetingParticipant.create({ data: { meetingId, userId } });
  }

  async remove(meetingId: string, userId: string): Promise<void> {
    await this.prisma.meetingParticipant.deleteMany({ where: { meetingId, userId } });
  }

  async setAttended(meetingId: string, userId: string, attended: boolean): Promise<MeetingParticipantRecord> {
    return this.prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data: { attended },
    });
  }

  async findByMeetingAndUser(meetingId: string, userId: string): Promise<MeetingParticipantRecord | null> {
    return this.prisma.meetingParticipant.findUnique({ where: { meetingId_userId: { meetingId, userId } } });
  }

  async listForMeeting(meetingId: string): Promise<MeetingParticipantRecord[]> {
    return this.prisma.meetingParticipant.findMany({ where: { meetingId }, orderBy: { createdAt: "asc" } });
  }
}
