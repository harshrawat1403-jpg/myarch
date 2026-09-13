import type { EmailTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * Context: { recipientName, loginUrl, loginEmail, temporaryPassword }
 *
 * This template is rendered only for direct, post-commit delivery. Its
 * secret-bearing context must never be passed to NotificationService, which
 * persists notification and job payloads.
 */
export const accountCredentialsDeliveryTemplate: EmailTemplateDefinition = {
  subject: () => "Your MYARCH account has been created",

  bodyText: (context) => {
    const recipientName = String(context.recipientName ?? "there");
    const loginUrl = String(context.loginUrl ?? "");
    const loginEmail = String(context.loginEmail ?? "");
    const temporaryPassword = String(context.temporaryPassword ?? "");
    return (
      `Hello ${recipientName},\n\n` +
      "Your MYARCH student account has been created.\n\n" +
      `Login: ${loginUrl}\n` +
      `Email: ${loginEmail}\n` +
      `Temporary password: ${temporaryPassword}\n\n` +
      "Please sign in and change your password after your first login. Do not share this temporary password with anyone.\n\n" +
      "Department of Architecture & Planning\nMYARCH"
    );
  },

  bodyHtml: (context) => {
    const recipientName = escapeHtml(String(context.recipientName ?? "there"));
    const loginUrl = escapeHtml(String(context.loginUrl ?? ""));
    const loginEmail = escapeHtml(String(context.loginEmail ?? ""));
    const temporaryPassword = escapeHtml(String(context.temporaryPassword ?? ""));
    return (
      `<p>Hello ${recipientName},</p>` +
      "<p>Your MYARCH student account has been created.</p>" +
      `<p><strong>Login:</strong> <a href=\"${loginUrl}\">${loginUrl}</a><br />` +
      `<strong>Email:</strong> ${loginEmail}<br />` +
      `<strong>Temporary password:</strong> <code>${temporaryPassword}</code></p>` +
      "<p>Please sign in and change your password after your first login. Do not share this temporary password with anyone.</p>" +
      "<p>Department of Architecture &amp; Planning<br />MYARCH</p>"
    );
  },
};
