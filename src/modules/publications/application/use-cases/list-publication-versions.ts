import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicationVersionRecord } from "../../domain/entities";
import { PublicationNotFoundError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";
import type { PublicationVersionRepository } from "../ports/publication-version-repository";

export class ListPublicationVersionsUseCase {
  constructor(private readonly deps: { publicationRepository: PublicationRepository; versionRepository: PublicationVersionRepository }) {}

  async execute(actor: AuthenticatedActor, publicationId: string): Promise<PublicationVersionRecord[]> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to view publication versions");
    const publication = await this.deps.publicationRepository.findById(publicationId);
    if (!publication) throw new PublicationNotFoundError();
    return this.deps.versionRepository.listForPublication(publicationId);
  }
}
