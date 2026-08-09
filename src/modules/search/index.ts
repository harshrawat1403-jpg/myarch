/**
 * Public exports of the search module. Other modules must import only from
 * here — never reach into search/domain, search/application, or
 * search/infrastructure directly (docs/architecture/07_Repository_Structure.md).
 */

export type { GlobalSearchResults, GlobalSearchResultItem, StudentSearchResult, CompanySearchResult, DriveSearchResult, PublicationSearchResult } from "./domain/entities";

export { globalSearchRouteHandler } from "./presentation/route-handlers/search";
