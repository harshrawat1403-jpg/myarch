import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 1 — notifies the Technical Secretary(s) that a new
 * self-signed-up Recruiter or Alumni account is awaiting approval. Delivered
 * via the normal notify() path (a real userId — the Secretary — already
 * exists to notify), IN_APP-only — mirrors REGISTRATION_SUBMITTED's own
 * "staff-facing, routine, keep email volume down" precedent exactly, one
 * shared template for both account types rather than two near-duplicates.
 *
 * Context: { accountType: "RECRUITER" | "ALUMNI", applicantName: string }
 */
export const accountSignupPendingReviewTemplate: EmailTemplateDefinition = {
  subject: (context) => `New ${accountTypeLabel(context.accountType)} account awaiting review`,

  bodyText: (context) => {
    const applicantName = String(context.applicantName ?? "Someone");
    const typeLabel = accountTypeLabel(context.accountType);
    return `${applicantName} has signed up for a ${typeLabel} account and is awaiting your review.\n\nPlease log in to MYARCH to approve or reject it.`;
  },

  bodyHtml: (context) => {
    const applicantName = escapeHtml(String(context.applicantName ?? "Someone"));
    const typeLabel = escapeHtml(accountTypeLabel(context.accountType));
    return (
      `<p><strong>${applicantName}</strong> has signed up for a <strong>${typeLabel}</strong> account and is awaiting your review.</p>` +
      "<p>Please log in to MYARCH to approve or reject it.</p>"
    );
  },
};

export const accountSignupPendingReviewInAppTemplate: InAppTemplateDefinition = {
  title: (context) => `New ${accountTypeLabel(context.accountType)} account`,
  message: (context) =>
    `${String(context.applicantName ?? "Someone")} signed up for a ${accountTypeLabel(context.accountType)} account.`,
};

function accountTypeLabel(accountType: unknown): string {
  return accountType === "ALUMNI" ? "Alumni" : "Recruiter";
}
