import type { NotificationTemplateId } from "../../domain/entities";
import type { RenderedEmailMessage } from "../ports/email-provider";
import { EMAIL_TEMPLATE_REGISTRY, IN_APP_TEMPLATE_REGISTRY } from "./registry";
import { accountCredentialsDeliveryTemplate } from "./definitions/account-credentials-delivery";
import { wrapHtml, wrapText } from "./layout";

/**
 * Direct-only templates may contain one-time secrets. They intentionally do
 * not belong to NotificationTemplateId, preventing NotificationService from
 * accepting and persisting their context in Notification/Job payloads.
 */
export type DirectEmailTemplateId = NotificationTemplateId | "ACCOUNT_CREDENTIALS_DELIVERY";

/**
 * Pure, synchronous, no I/O — this is why template rendering isn't behind a
 * port/interface like EmailProvider or NotificationRepository: there is
 * nothing here to swap at the infrastructure boundary, only content to
 * compose. NotificationService calls this directly.
 */
export function renderEmailTemplate(
  templateId: DirectEmailTemplateId,
  context: Record<string, unknown>,
  recipientEmail: string,
): RenderedEmailMessage {
  const definition =
    templateId === "ACCOUNT_CREDENTIALS_DELIVERY"
      ? accountCredentialsDeliveryTemplate
      : EMAIL_TEMPLATE_REGISTRY[templateId];
  return {
    to: recipientEmail,
    subject: definition.subject(context),
    text: wrapText(definition.bodyText(context)),
    html: wrapHtml(definition.bodyHtml(context)),
  };
}

/** V4.0 E1 — the IN_APP counterpart to renderEmailTemplate, used by ListMyNotificationsUseCase. */
export function renderInAppTemplate(
  templateId: NotificationTemplateId,
  context: Record<string, unknown>,
): { title: string; message: string } {
  const definition = IN_APP_TEMPLATE_REGISTRY[templateId];
  return { title: definition.title(context), message: definition.message(context) };
}
