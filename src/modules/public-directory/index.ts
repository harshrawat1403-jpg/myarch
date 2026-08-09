/**
 * Public exports of the public-directory module. Other modules must import
 * only from here (docs/architecture/07_Repository_Structure.md).
 */

export type { PublicDirectoryProfile, PublicDirectorySearchFilters } from "./domain/entities";
export { PublicProfileNotFoundError } from "./domain/errors";
export { searchPublicDirectoryUseCase, getPublicProfileUseCase } from "./infrastructure/container";

export { searchPublicDirectoryRouteHandler } from "./presentation/route-handlers/search";
export { getPublicProfileRouteHandler } from "./presentation/route-handlers/get";
