import type { AnnouncementRecipientRepository } from "../../../src/modules/announcements/application/ports/announcement-recipient-repository";

export class InMemoryAnnouncementRecipientRepository implements AnnouncementRecipientRepository {
  private readonly byAnnouncement = new Map<string, string[]>();

  async setForAnnouncement(announcementId: string, userIds: readonly string[]): Promise<void> {
    this.byAnnouncement.set(announcementId, [...userIds]);
  }

  async listUserIdsForAnnouncement(announcementId: string): Promise<string[]> {
    return this.byAnnouncement.get(announcementId) ?? [];
  }

  async isRecipient(announcementId: string, userId: string): Promise<boolean> {
    return (this.byAnnouncement.get(announcementId) ?? []).includes(userId);
  }
}
