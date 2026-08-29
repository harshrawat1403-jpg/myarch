import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { canManageContentOverrides } from "../../domain/permissions";
import type { ContentOverrideRepository } from "../ports/content-override-repository";

/**
 * The toolbar's "Save Changes" action — makes every pending draft, across
 * every page, the live public content in one action. No page scoping: the
 * toolbar tracks one global "N changes" count for the whole editing
 * session, so publish/discard act on that same whole set.
 */
export class PublishDraftContentOverridesUseCase {
  constructor(private readonly deps: { contentOverrideRepository: ContentOverrideRepository; auditRecorder: AuditRecorder }) {}

  async execute(actor: AuthenticatedActor): Promise<{ published: number }> {
    if (!canManageContentOverrides(actor)) throw new NotAuthorizedError("Not authorized to publish page content");

    const published = await this.deps.contentOverrideRepository.publishAllDrafts();

    await this.deps.auditRecorder.record({
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.CONTENT_OVERRIDES_PUBLISHED,
      targetEntityType: "ContentOverride",
      targetEntityId: actor.userId,
      metadata: { count: published },
    });

    return { published };
  }
}
