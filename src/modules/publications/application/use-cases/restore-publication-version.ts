import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import type { PublicationRecord } from "../../domain/entities";
import { PublicationNotFoundError, PublicationVersionConflictError, PublicationVersionNotFoundError } from "../../domain/errors";
import type { PublicationRepository } from "../ports/publication-repository";
import type { PublicationVersionRepository } from "../ports/publication-version-repository";

/**
 * V4.0 E4 (§13.4 — "a restore creates a NEW draft state from an old
 * snapshot, it does not rewrite history"). Only ever touches `contentJson`
 * via the normal optimistic-locked save path — status is left exactly as it
 * was, so restoring an old draft into an already-PUBLISHED publication
 * requires an explicit, separate Publish action to actually go live again.
 */
export class RestorePublicationVersionUseCase {
  constructor(
    private readonly deps: {
      publicationRepository: PublicationRepository;
      versionRepository: PublicationVersionRepository;
      auditRecorder: AuditRecorder;
    },
  ) {}

  async execute(actor: AuthenticatedActor, publicationId: string, versionNumber: number): Promise<PublicationRecord> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to restore publication versions");

    const existing = await this.deps.publicationRepository.findById(publicationId);
    if (!existing) throw new PublicationNotFoundError();

    const version = await this.deps.versionRepository.findByVersionNumber(publicationId, versionNumber);
    if (!version) throw new PublicationVersionNotFoundError();

    const restored = await this.deps.publicationRepository.updateContent(publicationId, {
      title: existing.title,
      content: version.content,
      pageSize: existing.pageSize,
      expectedVersion: existing.version,
      editedByUserId: actor.userId,
    });
    if (!restored) throw new PublicationVersionConflictError();

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.PUBLICATION_VERSION_RESTORED,
      targetEntityType: "Publication",
      targetEntityId: publicationId,
      metadata: { restoredFromVersion: versionNumber },
    });

    return restored;
  }
}
