import type { AuthenticatedActor } from "@/modules/auth";
import { canManagePublications } from "@/modules/auth";
import { NotAuthorizedError } from "@/lib/errors";
import type { PublicationContent } from "../../domain/blocks";
import type { PublicationDataLookup } from "../ports/publication-data-lookup";
import { resolveContentData, type ResolvedContentData } from "../resolve-content-data";

/**
 * V4.0 E4 (§13.1 step 4 — "Preview renders the current draft state exactly
 * as it will export"). Resolves whatever the editor currently holds in
 * memory, not just what's already saved — so a Preview taken mid-edit,
 * before any Save Draft, still reflects real, live platform data.
 */
export class GetPreviewDataUseCase {
  constructor(private readonly deps: { dataLookup: PublicationDataLookup }) {}

  async execute(actor: AuthenticatedActor, content: PublicationContent): Promise<ResolvedContentData> {
    if (!canManagePublications(actor)) throw new NotAuthorizedError("Not authorized to preview publications");
    return resolveContentData(content, this.deps.dataLookup);
  }
}
