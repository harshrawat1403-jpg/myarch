import type { PublicDirectoryProfile } from "../../domain/entities";
import { PublicProfileNotFoundError } from "../../domain/errors";
import type { PublicDirectoryRepository } from "../ports/public-directory-repository";

/** Public, unauthenticated. A student who is private, unapproved, inactive, or in a non-active batch simply doesn't exist from this use case's point of view — 404, never a 403 (no auth boundary to fail). */
export class GetPublicProfileUseCase {
  constructor(private readonly deps: { publicDirectoryRepository: PublicDirectoryRepository }) {}

  async execute(studentId: string): Promise<PublicDirectoryProfile> {
    const profile = await this.deps.publicDirectoryRepository.findByStudentId(studentId);
    if (!profile) throw new PublicProfileNotFoundError();
    return profile;
  }
}
