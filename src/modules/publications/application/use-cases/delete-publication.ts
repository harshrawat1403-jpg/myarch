import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { PublicationNotFoundError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";

export class DeletePublicationUseCase {
  constructor(private readonly deps: { publicationRepository: PublicationRepository; auditRecorder: AuditRecorder }) {}

  async execute(actor: AuthenticatedActor, publicationId: string): Promise<void> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to delete publications");

    const existing = await this.deps.publicationRepository.findById(publicationId);
    if (!existing) throw new PublicationNotFoundError();

    await this.deps.publicationRepository.delete(publicationId);

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.PUBLICATION_DELETED,
      targetEntityType: "Publication",
      targetEntityId: publicationId,
      metadata: { title: existing.title },
    });
  }
}
