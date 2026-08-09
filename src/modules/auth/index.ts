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
  CurrentPasswordIncorrectError,
  NewPasswordSameAsCurrentError,
  UserNotFoundError,
} from "./domain/errors";
export {
  canViewPrivateProfile,
  canEditPrivateAdminFields,
  canEditOwnContactInfo,
  canEditPublicProfileDraft,
  canApprovePublicProfile,
  canRequestProfileChanges,
  canViewApprovedPublicProfile,
  canAccessRecruiterDirectory,
  canManageBatches,
  canManageCoordinatorAccounts,
  canExportBatchData,
  canViewAuditLogs,
  canChangeBatchLifecycleStatus,
  canAccessUserDirectory,
  canManageCompanies,
  canViewCompanies,
  canReviewRegistrationRequest,
  canDecideRegistrationRequest,
  canManagePlacementDrive,
  canPublishPlacementDrive,
  canApplyToPlacementDrive,
  canManageApplication,
  canManageAlumni,
  canManagePublications,
} from "./domain/permissions";

// RBAC primitive other modules use to protect their own routes — see
// docs/api/10_API_Architecture.md's authorization flow.
export { withAuth } from "./infrastructure/container";
export type { AuthOptions, AuthenticatedHandler } from "./presentation/with-auth";

// V3.0 Administration Platform: the shared password-reset primitive every
// role-management module (students, coordinators, recruiters) calls into
// from its own reset-password route handler, plus the input/result shapes
// needed to call it.
export { getAdminResetPasswordUseCase, revokeUserSessions } from "./infrastructure/container";
export type {
  AdminResetPasswordInput,
  AdminResetPasswordResult,
} from "./application/use-cases/admin-reset-password";

// Route handlers, mounted by the thin files under src/app/api/auth/*.
export { loginRouteHandler } from "./presentation/route-handlers/login";
export { logoutRouteHandler } from "./presentation/route-handlers/logout";
export { refreshRouteHandler } from "./presentation/route-handlers/refresh";
export { meRouteHandler } from "./presentation/route-handlers/me";
export { changePasswordRouteHandler } from "./presentation/route-handlers/change-password";
export { updateProfileRouteHandler } from "./presentation/route-handlers/update-profile";
export { uploadAvatarRouteHandler } from "./presentation/route-handlers/upload-avatar";
export { serveFileRouteHandler } from "./presentation/route-handlers/serve-file";
