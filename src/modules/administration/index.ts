/**
 * Public exports of the administration module. Other modules must import
 * only from here (docs/architecture/07_Repository_Structure.md).
 */

export type { DirectoryEntry, DirectoryRole, DirectorySearchFilters } from "./domain/entities";

export { searchUserDirectoryRouteHandler } from "./presentation/route-handlers/search";
