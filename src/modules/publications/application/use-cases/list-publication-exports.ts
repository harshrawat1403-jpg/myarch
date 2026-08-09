import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicationExportRecord } from "../../domain/entities";
import { PublicationNotFoundError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";
import type { PublicationExportRepository } from "../ports/publication-export-repository";

export class ListPublicationExportsUseCase {
  constructor(private readonly deps: { publicationRepository: PublicationRepository; exportRepository: PublicationExportRepository }) {}

  async execute(actor: AuthenticatedActor, publicationId: string): Promise<PublicationExportRecord[]> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to view publication exports");
    const publication = await this.deps.publicationRepository.findById(publicationId);
    if (!publication) throw new PublicationNotFoundError();
    return this.deps.exportRepository.listForPublication(publicationId);
  }
}
