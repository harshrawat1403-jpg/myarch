import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 1 — sent via sendDirectEmail + renderEmailTemplate directly
 * (mirroring DecideRegistrationRequestUseCase's REGISTRATION_DECIDED
 * rejection-path precedent), never via notify(): the raw verification URL
 * (containing the one-time token) must never be persisted into
 * Notification.payload/Job.payload — see accountCredentialsIssuedTemplate's
 * own doc comment for why a secret-bearing context can never go through
 * that path. Never delivered IN_APP (no account may even exist yet — see
 * EmailVerificationToken's dual student-registration/self-signup shape) —
 * the InAppTemplateDefinition below exists only because
 * IN_APP_TEMPLATE_REGISTRY is a Record over every NotificationTemplateId,
 * not because this is ever actually shown in-app.
 *
 * Context: { recipientName: string, verifyUrl: string }
 */
export const emailVerificationTemplate: EmailTemplateDefinition = {
  subject: () => "Verify your email — MYARCH",

  bodyText: (context) => {
    const recipientName = String(context.recipientName ?? "there");
    const verifyUrl = String(context.verifyUrl ?? "");
    return (
      `Hi ${recipientName},\n\n` +
      "Please verify your email address to continue:\n" +
      `${verifyUrl}\n\n` +
      "This link expires in 24 hours. If you didn't request this, you can safely ignore this email."
    );
  },

  bodyHtml: (context) => {
    const recipientName = escapeHtml(String(context.recipientName ?? "there"));
    const verifyUrl = escapeHtml(String(context.verifyUrl ?? ""));
    return (
      `<p>Hi ${recipientName},</p>` +
      `<p>Please verify your email address to continue: <a href="${verifyUrl}">${verifyUrl}</a></p>` +
      "<p>This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>"
    );
  },
};

export const emailVerificationInAppTemplate: InAppTemplateDefinition = {
  title: () => "Verify your email",
  message: () => "Check your inbox to verify your email address.",
};
