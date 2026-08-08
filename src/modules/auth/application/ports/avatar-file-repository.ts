export interface CreateAvatarFileInput {
  readonly ownerUserId: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface AvatarFileRecord {
  readonly id: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly ownerUserId: string;
}

/**
 * Registers/reads/removes the FileAsset row backing a user's avatar
 * (classification always PUBLIC — see prisma/schema.prisma's User.avatar
 * doc comment). Scoped to avatars specifically rather than a generic
 * FileAsset port: students/ already has its own separate
 * FileReferenceRepository for confidential documents, and unifying the two
 * is deferred until a second real consumer makes the shared shape obvious
 * (the same "second use is the signal" rule applied elsewhere in this
 * phase).
 */
export interface AvatarFileRepository {
  create(input: CreateAvatarFileInput): Promise<AvatarFileRecord>;
  findById(fileId: string): Promise<AvatarFileRecord | null>;
  delete(fileId: string): Promise<void>;
}
