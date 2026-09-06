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

    // MYARCH Phase 1 (§2.4). EMAIL_VERIFICATION and PASSWORD_RESET_REQUESTED
    // are never delivered IN_APP (see each definition's own doc comment) —
    // this function is never actually called for them, but a case is still
    // required for exhaustiveness.
    case "EMAIL_VERIFICATION":
    case "PASSWORD_RESET_REQUESTED":
      return null;

    case "ACCOUNT_SIGNUP_PENDING_REVIEW":
      return context.accountType === "ALUMNI" ? "/dashboard/alumni" : "/dashboard/admin/recruiters";

    case "ACCOUNT_SIGNUP_DECIDED":
      // Mirrors REGISTRATION_DECIDED's own reasoning exactly: only
      // meaningful on APPROVED, where a real, now-usable account exists.
      if (context.decision !== "APPROVED") return null;
      return context.accountType === "ALUMNI" ? "/alumni" : "/recruiter";

    // MYARCH Phase 2 (§3.8) — every Task notification links to that task's
    // own detail view; role-specific task list pages don't exist yet, so
    // this is the one destination that works for every recipient role.
    case "TASK_ASSIGNED":
    case "TASK_REASSIGNED":
    case "TASK_DEADLINE_APPROACHING":
    case "TASK_OVERDUE":
    case "TASK_COMPLETED":
    case "TASK_ESCALATED": {
      const taskId = context.taskId;
      return typeof taskId === "string" && taskId.length > 0 ? `/tasks/${taskId}` : null;
    }

    // MYARCH Phase 2 (§3.1–§3.7) — Maintenance & Generic Requests.
    case "MAINTENANCE_ISSUE_SUBMITTED":
    case "MAINTENANCE_ISSUE_RESOLVED": {
      const issueId = context.issueId;
      return typeof issueId === "string" && issueId.length > 0 ? `/maintenance/${issueId}` : null;
    }

    case "REQUEST_SUBMITTED":
    case "REQUEST_DECIDED": {
      const requestId = context.requestId;
      return typeof requestId === "string" && requestId.length > 0 ? `/requests/${requestId}` : null;
    }

    // MYARCH Phase 3 (§4.5) — Announcements.
    case "ANNOUNCEMENT_PUBLISHED": {
      const announcementId = context.announcementId;
      return typeof announcementId === "string" && announcementId.length > 0 ? `/announcements/${announcementId}` : null;
    }

    // MYARCH Phase 4 (§5) — Council & Committees.
    case "COMMITTEE_MEMBER_ADDED": {
      const committeeId = context.committeeId;
      return typeof committeeId === "string" && committeeId.length > 0 ? `/committees/${committeeId}` : null;
    }

    case "ELECTION_APPLICATION_OPENED":
    case "ELECTION_PROCESSING_UPDATED":
      return "/student/elections";

    case "CORE_COMMITTEE_SELECTION_RESULT_PUBLISHED":
    case "CORE_COMMITTEE_SELECTION_SELECTED":
    case "CORE_COMMITTEE_SELECTION_NOT_SELECTED":
    case "CORE_COMMITTEE_SELECTION_MEMBERSHIP_CONFIRMED":
      return null;

    case "FORM_SUBMITTED":
    case "FORM_APPLICATION_REVIEWER_ASSIGNED":
      return "/dashboard/form-applications";

    case "FORM_APPLICATION_UNDER_REVIEW":
    case "FORM_APPLICATION_DECIDED":
      return "/student/form-applications";
  }
}
