import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * Context: { applicantName: string, decision: "APPROVED" | "REJECTED", rejectionReason?: string }
 *
 * On REJECTED, no User account exists yet — DecideRegistrationRequestUseCase
 * renders this template directly via renderEmailTemplate() and sends it
 * through sendDirectEmail (the same documented exception
 * ACCOUNT_CREDENTIALS_ISSUED's own doc comment describes), never through
 * NotificationService.notify(). On APPROVED, the account now exists, so this
 * goes through the normal notify() path like every other template — a
 * separate, distinct message from ACCOUNT_CREDENTIALS_ISSUED (decision
 * outcome vs. "your login is ready"), not a duplicate of it.
 */
export const registrationDecidedTemplate: EmailTemplateDefinition = {
  subject: (context) =>
    context.decision === "REJECTED" ? "Your MYARCH registration application" : "Your registration was approved",

  bodyText: (context) => {
    const applicantName = String(context.applicantName ?? "there");
    if (context.decision === "REJECTED") {
      const reason = String(context.rejectionReason ?? "");
      return (
        `Hello ${applicantName},\n\nYour registration application has been reviewed and was not approved.\n\n` +
        `Reason: ${reason}\n\nIf you believe this is in error, please contact an Admin directly.`
      );
    }
    return (
      `Hi ${applicantName},\n\nYour registration application has been approved. Your MYARCH account is ready — ` +
      "check your email for your temporary login credentials."
    );
  },

  bodyHtml: (context) => {
    const applicantName = escapeHtml(String(context.applicantName ?? "there"));
    if (context.decision === "REJECTED") {
      const reason = escapeHtml(String(context.rejectionReason ?? ""));
      return (
        `<p>Hello ${applicantName},</p><p>Your registration application has been reviewed and was not approved.</p>` +
        `<p><strong>Reason:</strong> ${reason}</p><p>If you believe this is in error, please contact an Admin directly.</p>`
      );
    }
    return (
      `<p>Hi ${applicantName},</p><p>Your registration application has been <strong>approved</strong>. Your MYARCH account ` +
      "is ready — check your email for your temporary login credentials.</p>"
    );
  },
};

export const registrationDecidedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => (context.decision === "REJECTED" ? "Registration not approved" : "Registration approved"),
  message: (context) =>
    context.decision === "REJECTED"
      ? String(context.rejectionReason ?? "Your registration application was not approved.")
      : "Your registration application has been approved.",
};
