/**
 * Public exports of the batches module. Other modules must import only from
 * here (docs/architecture/07_Repository_Structure.md).
 */

export type { Batch, BatchStatus } from "./domain/entities";
export { BatchNotFoundError } from "./domain/errors";

export { createBatchRouteHandler } from "./presentation/route-handlers/create";
export { listBatchesRouteHandler } from "./presentation/route-handlers/list";
export { getBatchRouteHandler } from "./presentation/route-handlers/get";
export { updateBatchRouteHandler } from "./presentation/route-handlers/update";
export { updateBatchStatusRouteHandler } from "./presentation/route-handlers/update-status";

// V3.0 Administration Platform: the academic-year module orchestrates a
// Secretary-confirmed batch-lifecycle transition plan (graduate/archive
// existing batches, create a new intake batch) by calling these same
// use cases per planned step — never a re-implementation of batch-status
// logic. Mirrors auth's export of getAdminResetPasswordUseCase for the
// identical cross-module-reuse reason.
export { createBatchUseCase, updateBatchStatusUseCase } from "./infrastructure/container";
