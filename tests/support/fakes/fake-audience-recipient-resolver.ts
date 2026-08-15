import type { AnnouncementAudienceType } from "../../../src/modules/announcements";
import type { AudienceRecipientResolver } from "../../../src/modules/announcements/application/ports/audience-recipient-resolver";

export class FakeAudienceRecipientResolver implements AudienceRecipientResolver {
  private readonly byAudienceType = new Map<AnnouncementAudienceType, string[]>();

  seed(audienceType: AnnouncementAudienceType, userIds: string[]): void {
    this.byAudienceType.set(audienceType, userIds);
  }

  async resolveRecipientUserIds(audienceType: AnnouncementAudienceType): Promise<string[]> {
    return this.byAudienceType.get(audienceType) ?? [];
  }
}
