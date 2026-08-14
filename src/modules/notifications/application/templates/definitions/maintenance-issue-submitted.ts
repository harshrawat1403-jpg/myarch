import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.1–§3.6) — notifies every active Secretary that a new
 * maintenance issue needs acknowledgment. IN_APP-only — mirrors
 * REGISTRATION_SUBMITTED/ACCOUNT_SIGNUP_PENDING_REVIEW's own "staff-facing,
 * routine, keep email volume down" precedent.
 *
 * Context: { issueId: string, category: string, location: string }
 */
export const maintenanceIssueSubmittedTemplate: EmailTemplateDefinition = {
  subject: (context) => `New maintenance issue: ${String(context.category ?? "")} at ${String(context.location ?? "")}`,
  bodyText: (context) =>
    `A new maintenance issue has been reported at ${String(context.location ?? "an unspecified location")} (${String(context.category ?? "")}). Please review and acknowledge it.`,
  bodyHtml: (context) =>
    `<p>A new maintenance issue has been reported at <strong>${escapeHtml(String(context.location ?? "an unspecified location"))}</strong> (${escapeHtml(String(context.category ?? ""))}). Please review and acknowledge it.</p>`,
};

export const maintenanceIssueSubmittedInAppTemplate: InAppTemplateDefinition = {
  title: () => "New maintenance issue",
  message: (context) => `${String(context.category ?? "Issue")} reported at ${String(context.location ?? "")}`,
};
