import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { canManageContentOverrides } from "../../domain/permissions";
import { InvalidContentOverrideError } from "../../domain/errors";
import type { ContentOverrideFileRepository } from "../ports/content-override-file-repository";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export interface UploadContentOverrideImageInput {
  readonly actor: AuthenticatedActor;
  readonly data: Buffer;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

/** Mirrors UploadPublicationImageUseCase/UploadAvatarUseCase exactly. Only uploads and returns a fileId — SaveContentOverrideUseCase is what actually attaches it to a page/contentKey. */
export class UploadContentOverrideImageUseCase {
  constructor(
    private readonly deps: {
      fileRepository: ContentOverrideFileRepository;
      saveFile(storageKey: string, data: Buffer): Promise<void>;
    },
  ) {}

  async execute(input: UploadContentOverrideImageInput): Promise<{ fileId: string }> {
    if (!canManageContentOverrides(input.actor)) throw new NotAuthorizedError("Not authorized to upload images");

    const extension = ALLOWED_MIME_TYPES[input.mimeType];
    if (!extension) throw new InvalidContentOverrideError("Only JPEG, PNG, or WebP images are allowed");
    if (input.sizeBytes > MAX_SIZE_BYTES) throw new InvalidContentOverrideError("Image must be 8MB or smaller");

    const storageKey = `content-overrides/${input.actor.userId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const created = await this.deps.fileRepository.create({
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    return { fileId: created.id };
  }
}
