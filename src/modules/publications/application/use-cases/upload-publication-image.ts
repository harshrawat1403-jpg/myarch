import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { InvalidPublicationContentError } from "../../domain/errors";
import type { PublicationImageFileRepository } from "../ports/publication-file-repository";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — publication images print at higher resolution than an avatar

export interface UploadPublicationImageInput {
  readonly actor: AuthenticatedActor;
  readonly data: Buffer;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

/** V4.0 E4 (§13.1 step 3 — "swap images") — mirrors UploadAvatarUseCase's exact pattern; classification PUBLIC (see publication-file-repository.ts). */
export class UploadPublicationImageUseCase {
  constructor(
    private readonly deps: {
      imageFileRepository: PublicationImageFileRepository;
      saveFile(storageKey: string, data: Buffer): Promise<void>;
    },
  ) {}

  async execute(input: UploadPublicationImageInput): Promise<{ fileId: string }> {
    if (!canManagePublications(input.actor)) throw new NotAuthorizedError("Not authorized to upload publication images");

    const extension = ALLOWED_MIME_TYPES[input.mimeType];
    if (!extension) throw new InvalidPublicationContentError("Only JPEG, PNG, or WebP images are allowed");
    if (input.sizeBytes > MAX_SIZE_BYTES) throw new InvalidPublicationContentError("Image must be 8MB or smaller");

    const storageKey = `publications/images/${input.actor.userId}-${Date.now()}.${extension}`;
    await this.deps.saveFile(storageKey, input.data);

    const created = await this.deps.imageFileRepository.create({
      ownerUserId: input.actor.userId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    return { fileId: created.id };
  }
}
