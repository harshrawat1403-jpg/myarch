/**
 * Public exports of the students module. Other modules must import only
 * from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  StudentIdentity,
  StudentPrivateFields,
  StudentRecord,
  StudentSearchFilters,
  StudentSearchResultItem,
  ConfidentialDocumentReference,
  BulkImportRunStatus,
  BulkImportRowError,
  BulkImportRunRecord,
} from "./domain/entities";
export type { CreateStudentInput } from "./application/use-cases/create-student";
export {
  StudentNotFoundError,
  DuplicateRollNumberError,
  DuplicateEmailError,
  BatchNotFoundError,
  BatchNotAssignableError,
  StudentAlreadyActiveError,
  StudentAlreadyArchivedError,
  ConfidentialDocumentNotFoundError,
  EmptyCsvFileError,
  BulkImportRunNotFoundError,
} from "./domain/errors";

export { createStudentRouteHandler } from "./presentation/route-handlers/create";
export { getStudentRouteHandler } from "./presentation/route-handlers/get";
export { updateStudentRouteHandler } from "./presentation/route-handlers/update";
export { archiveStudentRouteHandler } from "./presentation/route-handlers/archive";
export { restoreStudentRouteHandler } from "./presentation/route-handlers/restore";
export { searchStudentsRouteHandler } from "./presentation/route-handlers/search";
export { attachConfidentialDocumentRouteHandler } from "./presentation/route-handlers/attach-document";
export { listConfidentialDocumentsRouteHandler } from "./presentation/route-handlers/list-documents";
export { removeConfidentialDocumentRouteHandler } from "./presentation/route-handlers/remove-document";
export { resetStudentPasswordRouteHandler } from "./presentation/route-handlers/reset-password";
export { bulkSetStudentsActiveRouteHandler } from "./presentation/route-handlers/bulk-set-active";
export { startBulkImportRouteHandler } from "./presentation/route-handlers/start-bulk-import";
export { getBulkImportRunRouteHandler } from "./presentation/route-handlers/get-bulk-import-run";

// V3.0 Administration Platform: registers this module's background job
// handler (BULK_IMPORT_STUDENTS) — called once by scripts/run-worker.ts,
// never at import time. Mirrors notifications' registerJobHandlers().
export { registerBulkImportJobHandlers } from "./infrastructure/container";

// V4.0 B3: registration approval calls the *same* CreateStudentUseCase
// internally rather than a new public-facing variant (docs/planning/V4_0_PRD.md
// §6's "existing routes that change behavior, not shape"). Exported the same
// way auth exports revokeUserSessions/getAdminResetPasswordUseCase for
// cross-module reuse.
export { getCreateStudentUseCase } from "./infrastructure/container";
