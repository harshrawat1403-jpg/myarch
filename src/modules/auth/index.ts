/**
 * Public exports of the auth module. Other modules must import only from
 * here — never reach into auth/domain, auth/application, or
 * auth/infrastructure directly (docs/architecture/07_Repository_Structure.md).
 */

export type { Role, AuthenticatedActor } from "./domain/entities";
export {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenExpiredError,
  RefreshTokenReusedError,
} from "./domain/errors";
export {
  canViewPrivateProfile,
  canEditPrivateAdminFields,
  canEditOwnContactInfo,
  canEditPublicProfileDraft,
  canApproveOrRejectDraft,
  canViewApprovedPublicProfile,
  canAccessRecruiterDirectory,
  canManageBatches,
  canManageCoordinatorAccounts,
  canManageRecruiterAccounts,
  canExportBatchData,
  canViewAuditLogs,
  canChangeBatchLifecycleStatus,
} from "./domain/permissions";

// RBAC primitive other modules use to protect their own routes — see
// docs/api/10_API_Architecture.md's authorization flow.
export { withAuth } from "./infrastructure/container";
export type { AuthOptions, AuthenticatedHandler } from "./presentation/with-auth";

// Route handlers, mounted by the thin files under src/app/api/auth/*.
export { loginRouteHandler } from "./presentation/route-handlers/login";
export { logoutRouteHandler } from "./presentation/route-handlers/logout";
export { refreshRouteHandler } from "./presentation/route-handlers/refresh";
export { meRouteHandler } from "./presentation/route-handlers/me";
