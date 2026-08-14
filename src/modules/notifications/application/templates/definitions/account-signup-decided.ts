import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 1 — notifies a self-signed-up Recruiter/Alumni of the
 * Technical Secretary's decision. Dual-channel (mirrors
 * REGISTRATION_DECIDED's own "only a decision is dual-channel" precedent) —
 * one shared template for both account types and both decisions rather than
 * four near-duplicates.
 *
 * Context: { accountType: "RECRUITER" | "ALUMNI", decision: "APPROVED" | "REJECTED", rejectionReason?: string }
 */
export const accountSignupDecidedTemplate: EmailTemplateDefinition = {
  subject: (context) =>
    context.decision === "APPROVED"
      ? `Your MYARCH ${accountTypeLabel(context.accountType)} account is approved`
      : `Your MYARCH ${accountTypeLabel(context.accountType)} account request was declined`,

  bodyText: (context) => {
    const typeLabel = accountTypeLabel(context.accountType);
    if (context.decision === "APPROVED") {
      return `Your MYARCH ${typeLabel} account has been approved. You can now sign in.`;
    }
    const reason = context.rejectionReason ? ` Reason: ${String(context.rejectionReason)}` : "";
    return `Your MYARCH ${typeLabel} account request was declined.${reason}`;
  },

  bodyHtml: (context) => {
    const typeLabel = escapeHtml(accountTypeLabel(context.accountType));
    if (context.decision === "APPROVED") {
      return `<p>Your MYARCH ${typeLabel} account has been approved. You can now sign in.</p>`;
    }
    const reason = context.rejectionReason
      ? `<p>Reason: ${escapeHtml(String(context.rejectionReason))}</p>`
      : "";
    return `<p>Your MYARCH ${typeLabel} account request was declined.</p>${reason}`;
  },
};

export const accountSignupDecidedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => (context.decision === "APPROVED" ? "Account approved" : "Account request declined"),
  message: (context) =>
    context.decision === "APPROVED"
      ? `Your ${accountTypeLabel(context.accountType)} account has been approved.`
      : `Your ${accountTypeLabel(context.accountType)} account request was declined.`,
};

function accountTypeLabel(accountType: unknown): string {
  return accountType === "ALUMNI" ? "Alumni" : "Recruiter";
}
