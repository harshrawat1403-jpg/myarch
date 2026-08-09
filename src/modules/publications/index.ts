/**
 * Public exports of the publications module. Other modules must import only
 * from here — never reach into publications/domain, publications/application,
 * or publications/infrastructure directly (docs/architecture/07_Repository_Structure.md).
 */

export type {
  PublicationRecord,
  PublicationSummaryDTO,
  PublicationTemplateRecord,
  PublicationTemplateStructure,
  PublicationVersionRecord,
  PublicationExportRecord,
  PublicationType,
  PublicationStatus,
  PublicationPageSize,
  PublicationExportFormat,
  PublicationExportStatus,
  ResolvedStudentProfile,
  ResolvedCompany,
  ResolvedAlumniProfile,
  ResolvedStats,
} from "./domain/entities";
export type {
  PublicationBlock,
  PublicationContent,
  PublicationStyle,
  PublicationBlockType,
  PublicationDataBindingKind,
} from "./domain/blocks";
export { ACCENT_COLORS, FONT_PAIRINGS, DEFAULT_STYLE, findAccentColor, findFontPairing } from "./domain/blocks";
export type { SelectableDataResult } from "./application/use-cases/list-selectable-data";
export type { SelectableStudentOption, SelectableCompanyOption, SelectableAlumniOption } from "./application/ports/publication-data-lookup";

// registerPublicationJobHandlers is deliberately NOT re-exported here — see
// infrastructure/register-job-handlers.ts's own doc comment. Importing it
// from this barrel would pull Playwright/pptxgenjs into every route
// handler's bundle, since every route handler in this module also imports
// this same file. scripts/run-worker.ts imports it via a direct path
// instead (outside src/, so not subject to the module-boundary ESLint rule
// either — the same exception prisma/seed.ts already relies on).

export { listPublicationTemplatesRouteHandler } from "./presentation/route-handlers/list-templates";
export { getPublicationTemplateRouteHandler } from "./presentation/route-handlers/get-template";
export { listSelectableDataRouteHandler } from "./presentation/route-handlers/list-selectable-data";
export { getPreviewDataRouteHandler } from "./presentation/route-handlers/get-preview-data";
export { createPublicationRouteHandler } from "./presentation/route-handlers/create-publication";
export { searchPublicationsRouteHandler } from "./presentation/route-handlers/search-publications";
export { getPublicationRouteHandler } from "./presentation/route-handlers/get-publication";
export { updatePublicationRouteHandler } from "./presentation/route-handlers/update-publication";
export { deletePublicationRouteHandler } from "./presentation/route-handlers/delete-publication";
export { publishPublicationRouteHandler } from "./presentation/route-handlers/publish-publication";
export { listPublicationVersionsRouteHandler } from "./presentation/route-handlers/list-versions";
export { restorePublicationVersionRouteHandler } from "./presentation/route-handlers/restore-version";
export { uploadPublicationImageRouteHandler } from "./presentation/route-handlers/upload-image";
export { requestPublicationExportRouteHandler } from "./presentation/route-handlers/request-export";
export { listPublicationExportsRouteHandler } from "./presentation/route-handlers/list-exports";
export { downloadPublicationExportRouteHandler } from "./presentation/route-handlers/download-export";
