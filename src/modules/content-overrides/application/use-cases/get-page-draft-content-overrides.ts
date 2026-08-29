import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { canManageContentOverrides } from "../../domain/permissions";
import type { PageDraftOverrides } from "../../domain/entities";
import type { ContentOverrideRepository } from "../ports/content-override-repository";

/**
 * SECRETARY-only — the only place draft (unpublished) content is ever
 * read. Powers Preview: the client merges these over the already-loaded
 * published values for the same page, in the same page component (no
 * second renderer, no route).
 */
export class GetPageDraftContentOverridesUseCase {
  constructor(private readonly deps: { contentOverrideRepository: ContentOverrideRepository }) {}

  async execute(actor: AuthenticatedActor, page: string): Promise<PageDraftOverrides> {
    if (!canManageContentOverrides(actor)) throw new NotAuthorizedError("Not authorized to preview draft page content");

    return this.deps.contentOverrideRepository.findDraftByPage(page);
  }
}
