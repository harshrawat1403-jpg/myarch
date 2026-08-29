import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { canManageContentOverrides } from "../../domain/permissions";
import type { ContentOverrideRepository } from "../ports/content-override-repository";

/**
 * "Reset to original" for ONE field — distinct from the toolbar's Discard
 * (which abandons every pending draft at once, see
 * `DiscardDraftContentOverridesUseCase`). Stages the reset as a pending
 * draft change if the field currently has a published value (so the live
 * site is unaffected until Publish); if the field was only ever a draft
 * that never went live, there's nothing to stage, so the row is deleted
 * outright. Never touches the underlying FileAsset — orphan-safe by
 * construction: nothing in this module ever calls deleteFile.
 */
export class RemoveContentOverrideUseCase {
  constructor(private readonly deps: { contentOverrideRepository: ContentOverrideRepository; auditRecorder: AuditRecorder }) {}

  async execute(actor: AuthenticatedActor, page: string, contentKey: string): Promise<void> {
    if (!canManageContentOverrides(actor)) throw new NotAuthorizedError("Not authorized to edit page content");

    await this.deps.contentOverrideRepository.stageReset(page, contentKey, actor.userId);

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.CONTENT_OVERRIDE_REMOVED,
      targetEntityType: "ContentOverride",
      targetEntityId: actor.userId,
      metadata: { page, contentKey, staged: true },
    });
  }
}
