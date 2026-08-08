import type { AuthenticatedActor } from "../../domain/entities";
import { InvalidAvatarFileError } from "../../domain/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "../ports/audit-recorder";
import type { AvatarFileRepository } from "../ports/avatar-file-repository";
import type { UserRepository } from "../ports/user-repository";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export interface UploadAvatarInput {
  readonly actor: AuthenticatedActor;
  readonly data: Buffer;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface UploadAvatarResult {
  readonly fileId: string;
}

export interface UploadAvatarUseCaseDeps {
  userRepository: UserRepository;
  avatarFileRepository: AvatarFileRepository;
  auditRecorder: AuditRecorder;
  saveFile(storageKey: string, data: Buffer): Promise<void>;
  deleteFile(storageKey: string): Promise<void>;
}

/**
 * Replaces (or sets, first time) the actor's own avatar. Deletes the
 * previous FileAsset row and its on-disk bytes once the new one is safely
 * stored and referenced — cleanup happens last so a mid-upload failure
 * never leaves a user with no avatar at all.
 */
export class UploadAvatarUseCase {
  constructor(private readonly deps: UploadAvatarUseCaseDeps) {}

  async execute(input: UploadAvatarInput): Promise<UploadAvatarResult> {
    const extension = ALLOWED_MIME_TYPES[input.mimeType];
    if (!extension) {
      throw new InvalidAvatarFileError("Only JPEG, PNG, or WebP images are allowed");
    }
    if (input.sizeBytes > MAX_SIZE_BYTES) {
      throw new InvalidAvatarFileError("Image must be 2MB or smaller");
    }

    const user = await this.deps.userRepository.findById(input.actor.userId);
    const previousAvatarFileId = user?.avatarFileId ?? null;

    const storageKey = `avatars/${input.actor.userId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const created = await this.deps.avatarFileRepository.create({
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    await this.deps.userRepository.setAvatarFileId(input.actor.userId, created.id);

    if (previousAvatarFileId) {
      const previous = await this.deps.avatarFileRepository.findById(previousAvatarFileId);
      await this.deps.avatarFileRepository.delete(previousAvatarFileId);
      if (previous) {
        await this.deps.deleteFile(previous.storageKey).catch(() => {
          // Best-effort disk cleanup — an orphaned file on disk is a minor
          // leak, never worth failing an otherwise-successful upload over.
        });
      }
    }

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.ACCOUNT_SETTINGS_UPDATED,
      targetEntityType: "User",
      targetEntityId: input.actor.userId,
      metadata: { field: "avatar" },
    });

    return { fileId: created.id };
  }
}
