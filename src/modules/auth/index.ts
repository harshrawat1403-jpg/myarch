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
  InvalidVerificationTokenError,
  VerificationTokenExpiredError,
  InvalidPasswordResetTokenError,
  PasswordResetTokenExpiredError,
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
export { getAdminResetPasswordUseCase, revokeUserSessions, hashPassword } from "./infrastructure/container";
// Transaction-scoped sibling of getAdminResetPasswordUseCase(), for
// registration's approval flow — see that function's own doc comment.
export { buildAdminResetPasswordUseCase } from "./infrastructure/container";
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
export { resendVerificationRouteHandler } from "./presentation/route-handlers/resend-verification";
export { forgotPasswordRouteHandler } from "./presentation/route-handlers/forgot-password";
export { resetPasswordRouteHandler } from "./presentation/route-handlers/reset-password";

// MYARCH Phase 1 (§2.4) — self-signup entry points other modules call into.
// getIssueEmailVerificationTokenUseCase: consumed by registration
// (student signup — a RegistrationRequest, no User yet), recruiters, and
// alumni (both create a User immediately) so every self-signup path proves
// email control through the exact same infrastructure. getVerifyEmailUseCase
// is consumed only by /api/auth/verify-email/route.ts directly (not a
// module route-handler file) — see that route's own doc comment for why the
// registration-request cross-module step has to live there instead of
// inside this module.
export {
  getIssueEmailVerificationTokenUseCase,
  getVerifyEmailUseCase,
} from "./infrastructure/container";
export type {
  EmailVerificationDeliveryResult,
  IssueEmailVerificationTokenInput,
} from "./application/use-cases/issue-email-verification";
export type { VerifyEmailResult } from "./application/use-cases/verify-email";
