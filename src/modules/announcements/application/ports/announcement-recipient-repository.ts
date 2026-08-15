/** Only populated when audienceType = SELECTED_GROUP — see schema.prisma's AnnouncementRecipient doc comment. */
export interface AnnouncementRecipientRepository {
  setForAnnouncement(announcementId: string, userIds: readonly string[]): Promise<void>;
  listUserIdsForAnnouncement(announcementId: string): Promise<string[]>;
  isRecipient(announcementId: string, userId: string): Promise<boolean>;
}
