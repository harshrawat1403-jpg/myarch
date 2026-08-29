import type { PageContentOverrides } from "../../domain/entities";
import type { ContentOverrideRepository } from "../ports/content-override-repository";

/**
 * No auth check — content is public. Called directly by each target
 * page's Server Component (the one per-page DB read), never through an
 * API route: nothing outside that Server Component needs this data, since
 * a saved edit's effect is just "the next render resolves the new value."
 */
export class GetPageContentOverridesUseCase {
  constructor(private readonly deps: { contentOverrideRepository: ContentOverrideRepository }) {}

  async execute(page: string): Promise<PageContentOverrides> {
    return this.deps.contentOverrideRepository.findByPage(page);
  }
}
