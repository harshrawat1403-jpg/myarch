import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PublicationRecord } from "../../domain/entities";
import { InvalidPublicationContentError, PublicationNotFoundError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";
import type { PublicationVersionRepository } from "../ports/publication-version-repository";

/**
 * V4.0 E4 (§13.1 step 5, §13.4) — flips status to PUBLISHED and appends an
 * append-only `PublicationVersion` snapshot of the content being published,
 * exactly as it exists right now. Repeatable: publishing again after further
 * edits creates the next version, it does not error on an already-published
 * publication — only ARCHIVED publications are blocked (unarchive first).
 */
export class PublishPublicationUseCase {
  constructor(
    private readonly deps: {
      publicationRepository: PublicationRepository;
      versionRepository: PublicationVersionRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(actor: AuthenticatedActor, publicationId: string, label?: string): Promise<PublicationRecord> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to publish publications");

    const existing = await this.deps.publicationRepository.findById(publicationId);
    if (!existing) throw new PublicationNotFoundError();
    if (existing.status === "ARCHIVED") {
      throw new InvalidPublicationContentError("An archived publication must be restored before it can be published");
    }

    await this.deps.versionRepository.create({
      publicationId,
      content: existing.content,
      label: label?.trim() || null,
      createdByUserId: actor.userId,
    });

    const published = await this.deps.publicationRepository.setStatus(publicationId, "PUBLISHED");

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.PUBLICATION_PUBLISHED,
      targetEntityType: "Publication",
      targetEntityId: publicationId,
    });

    return published;
  }
}
