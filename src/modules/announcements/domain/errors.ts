export class AnnouncementNotFoundError extends Error {
  constructor() {
    super("Announcement not found");
    this.name = "AnnouncementNotFoundError";
  }
}

export class InvalidAnnouncementAttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAnnouncementAttachmentError";
  }
}
