import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicationTemplateRecord, PublicationType } from "../../domain/entities";
import type { PublicationTemplateRepository } from "../ports/publication-template-repository";

/** V4.0 E3 (§13.1 step 1) — the template picker's own data source. */
export class ListPublicationTemplatesUseCase {
  constructor(private readonly deps: { templateRepository: PublicationTemplateRepository }) {}

  async execute(actor: AuthenticatedActor, type?: PublicationType): Promise<PublicationTemplateRecord[]> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to view publication templates");
    return this.deps.templateRepository.listActive(type);
  }
}
