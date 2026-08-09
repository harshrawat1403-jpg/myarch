import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicationTemplateRecord } from "../../domain/entities";
import { PublicationTemplateNotFoundError } from "../../domain/errors";
import type { PublicationTemplateRepository } from "../ports/publication-template-repository";

export class GetPublicationTemplateUseCase {
  constructor(private readonly deps: { templateRepository: PublicationTemplateRepository }) {}

  async execute(actor: AuthenticatedActor, templateId: string): Promise<PublicationTemplateRecord> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to view this publication template");
    const template = await this.deps.templateRepository.findById(templateId);
    if (!template) throw new PublicationTemplateNotFoundError();
    return template;
  }
}
