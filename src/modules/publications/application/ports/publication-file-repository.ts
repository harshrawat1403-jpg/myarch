export interface PublicationImageFileRecord {
  readonly id: string;
  readonly storageKey: string;
  readonly mimeType: string;
}

/**
 * Block images (cover photo, IMAGE blocks) — classification PUBLIC, same as
 * avatars/company logos, so the editor's live preview and the exported
 * render can both load them via the existing unauthenticated
 * `/api/files/[fileId]` route (no new download route needed for these).
 */
export interface PublicationImageFileRepository {
  create(input: { ownerUserId: string; storageKey: string; mimeType: string; sizeBytes: number }): Promise<PublicationImageFileRecord>;
  findById(fileId: string): Promise<PublicationImageFileRecord | null>;
  delete(fileId: string): Promise<void>;
}

export interface PublicationExportFileRecord {
  readonly id: string;
  readonly storageKey: string;
  readonly mimeType: string;
}

/**
 * Generated export artifacts (PDF/PPTX/PNG/JPEG) — classification PRIVATE,
 * same as internship certificates: downloaded only through a dedicated
 * authenticated route gated by `canManagePublications`, never the
 * unauthenticated public files route.
 */
export interface PublicationExportFileRepository {
  create(input: { ownerUserId: string; storageKey: string; mimeType: string; sizeBytes: number }): Promise<PublicationExportFileRecord>;
  findById(fileId: string): Promise<PublicationExportFileRecord | null>;
}
