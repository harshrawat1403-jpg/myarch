import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PublicationContent } from "../../domain/blocks";
import type { PublicationPageSize, PublicationRecord } from "../../domain/entities";
import { PublicationNotFoundError, PublicationVersionConflictError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";

export interface UpdatePublicationInput {
  readonly actor: AuthenticatedActor;
  readonly publicationId: string;
  readonly title: string;
  readonly content: PublicationContent;
  readonly pageSize: PublicationPageSize;
  readonly expectedVersion: number;
}

/** V4.0 E4 (§13.1 step "Save Draft") — block reorder/show-hide/edit/image-swap/style all land here as one content-tree save, optimistic-locked (§13.4). */
export class UpdatePublicationUseCase {
  constructor(private readonly deps: { publicationRepository: PublicationRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: UpdatePublicationInput): Promise<PublicationRecord> {
    if (!canManagePublications(input.actor)) throw new NotAuthorizedError("Not authorized to edit publications");

    const existing = await this.deps.publicationRepository.findById(input.publicationId);
    if (!existing) throw new PublicationNotFoundError();

    const updated = await this.deps.publicationRepository.updateContent(input.publicationId, {
      title: input.title.trim(),
      content: input.content,
      pageSize: input.pageSize,
      expectedVersion: input.expectedVersion,
      editedByUserId: input.actor.userId,
    });
    if (!updated) throw new PublicationVersionConflictError();

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.PUBLICATION_UPDATED,
      targetEntityType: "Publication",
      targetEntityId: updated.id,
    });

    return updated;
  }
}
