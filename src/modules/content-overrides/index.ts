/**
 * Public exports of the content-overrides module (MYARCH Edit Mode).
 * Server-only (route handlers pull in infrastructure/container.ts, which
 * imports `@/lib/prisma`) — client components must only `import type` from
 * here, or call the API via `apiClient`.
 */

export type {
  ContentOverrideType,
  ContentOverrideRecord,
  PageContentOverrides,
  DraftOverrideValue,
  PageDraftOverrides,
  DraftSummary,
} from "./domain/entities";
export { InvalidContentOverrideError } from "./domain/errors";
export { canManageContentOverrides } from "./domain/permissions";

export { getPageContentOverridesUseCase } from "./infrastructure/container";

export { saveContentOverrideRouteHandler } from "./presentation/route-handlers/save";
export { removeContentOverrideRouteHandler } from "./presentation/route-handlers/remove";
export { uploadContentOverrideImageRouteHandler } from "./presentation/route-handlers/upload-image";
export { getPageDraftContentOverridesRouteHandler } from "./presentation/route-handlers/get-page-draft";
export { getDraftSummaryRouteHandler } from "./presentation/route-handlers/get-draft-summary";
export { publishDraftContentOverridesRouteHandler } from "./presentation/route-handlers/publish";
export { discardDraftContentOverridesRouteHandler } from "./presentation/route-handlers/discard";
