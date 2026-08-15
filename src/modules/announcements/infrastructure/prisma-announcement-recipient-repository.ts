import type { PrismaClient } from "@prisma/client";
import type { AnnouncementRecipientRepository } from "../application/ports/announcement-recipient-repository";

export class PrismaAnnouncementRecipientRepository implements AnnouncementRecipientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async setForAnnouncement(announcementId: string, userIds: readonly string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.announcementRecipient.deleteMany({ where: { announcementId } }),
      this.prisma.announcementRecipient.createMany({
        data: userIds.map((userId) => ({ announcementId, userId })),
        skipDuplicates: true,
      }),
    ]);
  }

  async listUserIdsForAnnouncement(announcementId: string): Promise<string[]> {
    const rows = await this.prisma.announcementRecipient.findMany({ where: { announcementId }, select: { userId: true } });
    return rows.map((row) => row.userId);
  }

  async isRecipient(announcementId: string, userId: string): Promise<boolean> {
    const row = await this.prisma.announcementRecipient.findUnique({
      where: { announcementId_userId: { announcementId, userId } },
    });
    return row !== null;
  }
}
