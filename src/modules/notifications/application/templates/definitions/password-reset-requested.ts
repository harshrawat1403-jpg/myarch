import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 1 — sent via sendDirectEmail + renderEmailTemplate directly,
 * never via notify() — same reasoning as emailVerificationTemplate: the raw
 * reset URL carries a one-time secret token that must never be persisted.
 * ForgotPasswordUseCase always sends this (or nothing, if the email doesn't
 * exist) without ever revealing to the caller which happened — see that use
 * case's own doc comment for the anti-enumeration reasoning.
 *
 * Context: { recipientName: string, resetUrl: string }
 */
export const passwordResetRequestedTemplate: EmailTemplateDefinition = {
  subject: () => "Reset your MYARCH password",

  bodyText: (context) => {
    const recipientName = String(context.recipientName ?? "there");
    const resetUrl = String(context.resetUrl ?? "");
    return (
      `Hi ${recipientName},\n\n` +
      "A password reset was requested for your MYARCH account. If this was you, use the link below:\n" +
      `${resetUrl}\n\n` +
      "This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not change."
    );
  },

  bodyHtml: (context) => {
    const recipientName = escapeHtml(String(context.recipientName ?? "there"));
    const resetUrl = escapeHtml(String(context.resetUrl ?? ""));
    return (
      `<p>Hi ${recipientName},</p>` +
      "<p>A password reset was requested for your MYARCH account. If this was you, use the link below:</p>" +
      `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
      "<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will not change.</p>"
    );
  },
};

export const passwordResetRequestedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Password reset requested",
  message: () => "Check your inbox for a link to reset your password.",
};
