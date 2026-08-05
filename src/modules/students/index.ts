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
} from "./domain/entities";
export {
  StudentNotFoundError,
  DuplicateRollNumberError,
  DuplicateEmailError,
  BatchNotFoundError,
  BatchNotAssignableError,
  StudentAlreadyActiveError,
  StudentAlreadyArchivedError,
  ConfidentialDocumentNotFoundError,
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
