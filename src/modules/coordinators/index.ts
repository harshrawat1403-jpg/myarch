/**
 * Public exports of the coordinators module. Other modules must import
 * only from here (docs/architecture/07_Repository_Structure.md).
 */

export type {
  CoordinatorPosition,
  CoordinatorRecord,
  CoordinatorSearchFilters,
  MaintenanceCoordinatorRole,
} from "./domain/entities";
export {
  CoordinatorNotFoundError,
  DuplicateEmailError,
  BatchNotFoundError,
  CoordinatorAlreadyActiveError,
  CoordinatorAlreadyDisabledError,
  BatchAlreadyAssignedError,
  BatchNotAssignedError,
  MaxActiveCoordinatorsError,
  InvalidCoordinatorPermissionError,
  MaxActiveMaintenanceRoleError,
  InactiveCoordinatorError,
  NoMaintenanceCoordinatorDesignatedError,
} from "./domain/errors";
export { COORDINATOR_PERMISSION_KEYS, hasCoordinatorPermission, type CoordinatorPermissionKey } from "./domain/permissions";

export { createCoordinatorRouteHandler } from "./presentation/route-handlers/create";
export { getCoordinatorRouteHandler } from "./presentation/route-handlers/get";
export { updateCoordinatorRouteHandler } from "./presentation/route-handlers/update";
export { updateCoordinatorPermissionsRouteHandler } from "./presentation/route-handlers/update-permissions";
export { setCoordinatorMaintenanceRoleRouteHandler } from "./presentation/route-handlers/set-maintenance-role";
export { updateMaintenanceCoordinatorPermissionsRouteHandler } from "./presentation/route-handlers/update-maintenance-coordinator-permissions";
export { getMaintenanceCoordinatorRouteHandler } from "./presentation/route-handlers/get-maintenance-coordinator";
export { disableCoordinatorRouteHandler, enableCoordinatorRouteHandler } from "./presentation/route-handlers/set-active";
export { searchCoordinatorsRouteHandler } from "./presentation/route-handlers/search";
export { assignBatchRouteHandler, removeBatchRouteHandler } from "./presentation/route-handlers/batches";
export { resetCoordinatorPasswordRouteHandler } from "./presentation/route-handlers/reset-password";
export { bulkSetCoordinatorsActiveRouteHandler } from "./presentation/route-handlers/bulk-set-active";
export { getCoordinatorActivityRouteHandler } from "./presentation/route-handlers/activity";

// V3.0 Administration Platform: the academic-year module assigns
// coordinators to a newly created intake batch as one step of a confirmed
// transition plan — reuses this exact use case rather than duplicating
// batch-assignment logic. Mirrors auth's export of revokeUserSessions for
// the identical cross-module-reuse reason.
export { assignBatchUseCase } from "./infrastructure/container";
