import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { canManageContentOverrides } from "../../domain/permissions";
import type { ContentOverrideRepository } from "../ports/content-override-repository";

/**
 * The toolbar's "Discard Changes" action — abandons every pending draft,
 * across every page, restoring the last published state. Distinct from a
 * per-field Reset (`RemoveContentOverrideUseCase`), which only stages a
 * reset for one field and still requires Publish to take effect.
 */
export class DiscardDraftContentOverridesUseCase {
  constructor(private readonly deps: { contentOverrideRepository: ContentOverrideRepository; auditRecorder: AuditRecorder }) {}

  async execute(actor: AuthenticatedActor): Promise<{ discarded: number }> {
    if (!canManageContentOverrides(actor)) throw new NotAuthorizedError("Not authorized to discard page content changes");

    const discarded = await this.deps.contentOverrideRepository.discardAllDrafts();

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.CONTENT_OVERRIDES_DISCARDED,
      targetEntityType: "ContentOverride",
      targetEntityId: actor.userId,
      metadata: { count: discarded },
    });

    return { discarded };
  }
}
