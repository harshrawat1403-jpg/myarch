import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * Context: { recipientName: string, reason: "account_created" | "password_reset" }
 *
 * Deliberately carries NO password. AdminResetPasswordUseCase never puts the
 * generated temporary password in a notification's context — DefaultNotificationService
 * persists context verbatim into both Notification.payload and the dispatched
 * Job.payload, so a secret there would sit in cleartext indefinitely. This is
 * a non-secret "your credentials are ready" marker; the Secretary relays the
 * actual temporary password out-of-band via the reveal-once UI. Real email
 * sending is out of scope for this phase — this template exists so that
 * future phase has a working dispatch path to build on.
 */
export const accountCredentialsIssuedTemplate: EmailTemplateDefinition = {
  subject: (context) =>
    context.reason === "password_reset" ? "Your TNPArch password was reset" : "Your TNPArch account is ready",

  bodyText: (context) => {
    const recipientName = String(context.recipientName ?? "there");
    const isReset = context.reason === "password_reset";
    return (
      `Hi ${recipientName},\n\n` +
      (isReset
        ? "Your TNPArch account password has been reset by a department administrator."
        : "A TNPArch account has been created for you.") +
      " A temporary password has been issued — please contact the T&P office if you have not received it, " +
      "and you will be required to set a new password the first time you sign in."
    );
  },

  bodyHtml: (context) => {
    const recipientName = escapeHtml(String(context.recipientName ?? "there"));
    const isReset = context.reason === "password_reset";
    return (
      `<p>Hi ${recipientName},</p>` +
      `<p>${
        isReset
          ? "Your TNPArch account password has been reset by a department administrator."
          : "A TNPArch account has been created for you."
      } A temporary password has been issued — please contact the T&amp;P office if you have not received it, ` +
      "and you will be required to set a new password the first time you sign in.</p>"
    );
  },
};

export const accountCredentialsIssuedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => (context.reason === "password_reset" ? "Password reset" : "Account created"),
  message: (context) =>
    context.reason === "password_reset"
      ? "Your account password was reset by a department administrator."
      : "A TNPArch account has been created for you.",
};
