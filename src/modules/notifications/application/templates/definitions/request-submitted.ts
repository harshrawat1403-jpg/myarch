import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.7) — Generic Request System. Notifies every active
 * Secretary that a new request needs review. IN_APP-only, mirrors
 * MAINTENANCE_ISSUE_SUBMITTED's identical reasoning.
 *
 * Context: { requestId: string, type: string }
 */
export const requestSubmittedTemplate: EmailTemplateDefinition = {
  subject: (context) => `New request: ${String(context.type ?? "")}`,
  bodyText: (context) => `A new request has been submitted (${String(context.type ?? "")}). Please review it.`,
  bodyHtml: (context) =>
    `<p>A new request has been submitted (<strong>${escapeHtml(String(context.type ?? ""))}</strong>). Please review it.</p>`,
};

export const requestSubmittedInAppTemplate: InAppTemplateDefinition = {
  title: () => "New request",
  message: (context) => `New request: ${String(context.type ?? "")}`,
};
