/**
 * Public exports of the registration module. Other modules must import
 * only from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  RegistrationRequestRecord,
  RegistrationRequestSearchFilters,
  RegistrationRequestStatus,
  RegistrationSubmittedData,
} from "./domain/entities";
export {
  RegistrationBatchNotFoundError,
  RegistrationBatchNotOpenError,
  DuplicateRegistrationEmailError,
  DuplicateRegistrationRollNumberError,
  RegistrationRequestNotFoundError,
  InvalidRegistrationTransitionError,
} from "./domain/errors";

export { submitRegistrationRequestRouteHandler } from "./presentation/route-handlers/submit";
export { listOpenBatchesRouteHandler } from "./presentation/route-handlers/list-open-batches";
export { searchRegistrationRequestsRouteHandler } from "./presentation/route-handlers/search";
export { getRegistrationRequestRouteHandler } from "./presentation/route-handlers/get";
export { markRegistrationRequestRouteHandler } from "./presentation/route-handlers/mark";
export { decideRegistrationRequestRouteHandler } from "./presentation/route-handlers/decide";
