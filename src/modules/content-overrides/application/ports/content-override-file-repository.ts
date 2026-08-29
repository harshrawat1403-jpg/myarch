export interface ContentOverrideFileRecord {
  readonly id: string;
  readonly storageKey: string;
  readonly mimeType: string;
}

/**
 * Content-override images — classification PUBLIC, same as avatars/company
 * logos/Publication block images, served through the existing
 * unauthenticated `/api/files/[fileId]` route (no new download route).
 */
export interface ContentOverrideFileRepository {
  create(input: { ownerUserId: string; storageKey: string; mimeType: string; sizeBytes: number }): Promise<ContentOverrideFileRecord>;
}
