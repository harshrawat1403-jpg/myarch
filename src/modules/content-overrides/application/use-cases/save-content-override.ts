import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import type { AuditRecorder } from "@/lib/audit";
import { canManageContentOverrides } from "../../domain/permissions";
import { CONTENT_OVERRIDE_TEXT_MAX_LENGTH, type ContentOverrideRecord } from "../../domain/entities";
import { InvalidContentOverrideError } from "../../domain/errors";
import type { ContentOverrideRepository } from "../ports/content-override-repository";

export type SaveContentOverrideInput =
  | { readonly actor: AuthenticatedActor; readonly page: string; readonly contentKey: string; readonly type: "TEXT"; readonly textValue: string }
  | { readonly actor: AuthenticatedActor; readonly page: string; readonly contentKey: string; readonly type: "IMAGE"; readonly fileId: string };

/**
 * MYARCH Edit Mode — draft/preview/publish pass. Writes only the DRAFT
 * columns (`hasDraftChange=true`) — the published columns every public
 * visitor and every non-previewing Secretary sees are never touched here.
 * A field-level Save stages a pending change; only `PublishDraftContent
 * OverridesUseCase` ever makes it live.
 */
export class SaveContentOverrideUseCase {
  constructor(private readonly deps: { contentOverrideRepository: ContentOverrideRepository; auditRecorder: AuditRecorder }) {}

  async execute(input: SaveContentOverrideInput): Promise<ContentOverrideRecord> {
    if (!canManageContentOverrides(input.actor)) throw new NotAuthorizedError("Not authorized to edit page content");

    const page = input.page.trim();
    const contentKey = input.contentKey.trim();
    if (!page || !contentKey) throw new InvalidContentOverrideError("A page and content key are required");

    let textValue: string | null = null;
    let fileId: string | null = null;

    if (input.type === "TEXT") {
      const trimmed = input.textValue.trim();
      if (!trimmed) throw new InvalidContentOverrideError("Text cannot be empty — reset the field instead to restore the default");
      if (trimmed.length > CONTENT_OVERRIDE_TEXT_MAX_LENGTH) {
        throw new InvalidContentOverrideError(`Text must be ${CONTENT_OVERRIDE_TEXT_MAX_LENGTH} characters or fewer`);
      }
      textValue = trimmed;
    } else {
      fileId = input.fileId;
    }

    const saved = await this.deps.contentOverrideRepository.saveDraft({
      page,
      contentKey,
      type: input.type,
      textValue,
      fileId,
      updatedByUserId: input.actor.userId,
    });

    await this.deps.auditRecorder.record({
      actorUserId: input.actor.userId,
      action: AUDIT_ACTIONS.CONTENT_OVERRIDE_UPDATED,
      targetEntityType: "ContentOverride",
      targetEntityId: saved.id,
      metadata: { page, contentKey, staged: true },
    });

    return saved;
  }
}
