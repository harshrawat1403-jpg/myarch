export interface CreateCertificateFileInput {
  readonly ownerUserId: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface CertificateFileRecord {
  readonly id: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly ownerUserId: string;
}

/**
 * V4.0 D4 — registers/reads/removes the FileAsset row backing an internship
 * completion certificate (classification always PRIVATE — visible only to
 * the student it belongs to and Secretary/Coordinator, never served through
 * the public /api/files/[fileId] route). Mirrors auth/application/ports/
 * avatar-file-repository.ts's exact shape and "own narrow port, not a
 * shared generic FileAsset interface" reasoning.
 */
export interface CertificateFileRepository {
  create(input: CreateCertificateFileInput): Promise<CertificateFileRecord>;
  findById(fileId: string): Promise<CertificateFileRecord | null>;
  delete(fileId: string): Promise<void>;
}
