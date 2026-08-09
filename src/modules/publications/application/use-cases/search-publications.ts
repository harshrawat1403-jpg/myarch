import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicationSummaryDTO } from "../../domain/entities";
import type { PublicationRepository, PublicationSearchFilters } from "../ports/publication-repository";

export class SearchPublicationsUseCase {
  constructor(private readonly deps: { publicationRepository: PublicationRepository }) {}

  async execute(actor: AuthenticatedActor, filters: PublicationSearchFilters): Promise<PublicationSummaryDTO[]> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to view publications");
    return this.deps.publicationRepository.search(filters);
  }
}
