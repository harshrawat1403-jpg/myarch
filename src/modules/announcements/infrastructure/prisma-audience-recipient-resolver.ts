import type { PrismaClient } from "@prisma/client";
import type { AnnouncementAudienceType } from "../domain/entities";
import type { AudienceRecipientResolver } from "../application/ports/audience-recipient-resolver";

export class PrismaAudienceRecipientResolver implements AudienceRecipientResolver {
  constructor(private readonly prisma: PrismaClient) {}

  async resolveRecipientUserIds(
    audienceType: AnnouncementAudienceType,
    audienceValue: string | null,
    announcementId: string,
  ): Promise<string[]> {
    switch (audienceType) {
      case "EVERYONE": {
        const users = await this.prisma.user.findMany({
          where: { isActive: true, role: { not: "RECRUITER" } },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case "COORDINATORS": {
        const users = await this.prisma.user.findMany({
          where: { isActive: true, role: { in: ["COORDINATOR", "SECRETARY"] } },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case "YEAR": {
        if (!audienceValue) return [];
        const students = await this.prisma.studentProfile.findMany({
          where: { batchId: audienceValue, isActive: true },
          select: { userId: true },
        });
        return students.map((s) => s.userId);
      }
      case "SELECTED_GROUP": {
        const recipients = await this.prisma.announcementRecipient.findMany({
          where: { announcementId },
          select: { userId: true },
        });
        return recipients.map((r) => r.userId);
      }
      // PROGRAM/COMMITTEE/COUNCIL — no backing entity yet, see domain/entities.ts's isActorInAudience doc comment.
      case "PROGRAM":
      case "COMMITTEE":
      case "COUNCIL":
        return [];
    }
  }
}
