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
      // MYARCH Phase 4 (§5) — COMMITTEE/COUNCIL now resolve real recipients
      // via CommitteeMembership, mirroring isActorInAudience's own two cases.
      case "COMMITTEE": {
        if (!audienceValue) return [];
        const memberships = await this.prisma.committeeMembership.findMany({
          where: { committeeId: audienceValue, isActive: true },
          select: { userId: true },
        });
        return memberships.map((m) => m.userId);
      }
      case "COUNCIL": {
        const memberships = await this.prisma.committeeMembership.findMany({
          where: { isActive: true, committee: { type: "STUDENT_COUNCIL" } },
          select: { userId: true },
        });
        return memberships.map((m) => m.userId);
      }
      // PROGRAM — no backing entity anywhere in the roadmap, see
      // domain/entities.ts's isActorInAudience doc comment.
      case "PROGRAM":
        return [];
    }
  }
}
