import type { AuthenticatedActor } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import { canManageContentOverrides } from "../../domain/permissions";
import type { DraftSummary } from "../../domain/entities";
import type { ContentOverrideRepository } from "../ports/content-override-repository";

/** SECRETARY-only — powers the toolbar's "Edit Mode · N changes" count. */
export class GetDraftSummaryUseCase {
  constructor(private readonly deps: { contentOverrideRepository: ContentOverrideRepository }) {}

  async execute(actor: AuthenticatedActor): Promise<DraftSummary> {
    if (!canManageContentOverrides(actor)) throw new NotAuthorizedError("Not authorized to view pending page content changes");

    return this.deps.contentOverrideRepository.getDraftSummary();
  }
}
