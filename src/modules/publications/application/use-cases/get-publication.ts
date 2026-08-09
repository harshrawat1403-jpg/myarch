import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicationRecord } from "../../domain/entities";
import { PublicationNotFoundError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";

export class GetPublicationUseCase {
  constructor(private readonly deps: { publicationRepository: PublicationRepository }) {}

  async execute(actor: AuthenticatedActor, publicationId: string): Promise<PublicationRecord> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to view this publication");
    const publication = await this.deps.publicationRepository.findById(publicationId);
    if (!publication) throw new PublicationNotFoundError();
    return publication;
  }
}
