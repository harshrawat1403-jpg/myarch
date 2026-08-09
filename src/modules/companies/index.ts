/**
 * Public exports of the companies module. Other modules must import only
 * from here (docs/architecture/07_Repository_Structure.md).
 */

export type { CompanyRecord, CompanySearchFilters } from "./domain/entities";
export {
  CompanyNotFoundError,
  DuplicateCompanyNameError,
  CompanyAlreadyActiveError,
  CompanyAlreadyDisabledError,
} from "./domain/errors";

export { createCompanyRouteHandler } from "./presentation/route-handlers/create";
export { getCompanyRouteHandler } from "./presentation/route-handlers/get";
export { updateCompanyRouteHandler } from "./presentation/route-handlers/update";
export { disableCompanyRouteHandler, enableCompanyRouteHandler } from "./presentation/route-handlers/set-active";
export { searchCompaniesRouteHandler } from "./presentation/route-handlers/search";
