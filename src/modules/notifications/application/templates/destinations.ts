import type { NotificationTemplateId } from "../../domain/entities";

/**
 * Pure "what should clicking this notification do" mapping — reuses the raw
 * context notify() was called with (persisted verbatim as Notification.payload,
 * the same source renderInAppTemplate reads for title/message), never a new
 * column or a second notification-link table. A template with no case that
 * returns a real path here is simply not clickable — existing notifications
 * created before this mapping existed keep rendering exactly as before, just
 * without a destination, since a missing/malformed context field only ever
 * degrades to `null` rather than throwing.
 *
 * Every entry below only points at a route that already exists and already
 * enforces its own server-side authorization (withAuth/can* checks on the
 * destination page's own API calls) — this function never grants access,
 * it only tells the client where to ask.
 */
export function resolveNotificationDestination(
  templateId: NotificationTemplateId,
  context: Record<string, unknown>,
): string | null {
  switch (templateId) {
    case "PROFILE_APPROVED":
    case "PROFILE_CHANGES_REQUESTED":
      // Student's own profile editor — the recipient is always the student themselves.
      return "/student/profile";

    case "REGISTRATION_SUBMITTED":
    case "REGISTRATION_REVIEWED": {
      const requestId = context.requestId;
      return typeof requestId === "string" && requestId.length > 0
        ? `/dashboard/registrations/${requestId}`
        : "/dashboard/registrations";
    }

    case "REGISTRATION_DECIDED":
      // Only fires through notify() on APPROVE (REJECT goes via direct email
      // pre-account — see registrationDecidedTemplate's own doc comment), so
      // the recipient always has a real account now; their new Career Hub is
      // the most appropriate landing point, there being no more "my
      // registration status" page once an account exists.
      return context.decision === "APPROVED" ? "/student" : null;

    case "RECRUITER_INTEREST_RECEIVED":
      return "/student/interests";

    case "RECRUITER_INTEREST_RESPONDED":
      return "/recruiter/interests";

    case "PLACEMENT_DRIVE_ANNOUNCED":
    case "APPLICATION_STATUS_CHANGED":
      // No per-drive/per-application detail route exists for students today
      // — the parent page (open drives + my applications together) is the
      // honest, existing destination rather than an invented one.
      return "/student/applications";

    // No meaningful existing destination for either: ACCOUNT_CREDENTIALS_ISSUED
    // is a cross-role "your login is ready" marker with no single owning page,
    // and INTEREST_FACILITATION_REQUIRED has no dedicated facilitation-queue
    // page anywhere in the app.
    case "ACCOUNT_CREDENTIALS_ISSUED":
    case "INTEREST_FACILITATION_REQUIRED":
      return null;
  }
}
