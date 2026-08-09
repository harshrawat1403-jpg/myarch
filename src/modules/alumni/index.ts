/**
 * Public exports of the alumni module (V4.0 D5). Other modules must import
 * only from here (docs/architecture/07_Repository_Structure.md).
 */

export type { AlumniRecord, AlumniSearchFilters } from "./domain/entities";
export {
  AlumniNotFoundError,
  StudentProfileNotFoundError,
  DuplicateAlumniLinkError,
} from "./domain/errors";

export { createAlumniRouteHandler } from "./presentation/route-handlers/create";
export { updateAlumniRouteHandler } from "./presentation/route-handlers/update";
export { deleteAlumniRouteHandler } from "./presentation/route-handlers/delete";
export { searchAlumniRouteHandler } from "./presentation/route-handlers/search";
export { getAlumniRouteHandler } from "./presentation/route-handlers/get";
