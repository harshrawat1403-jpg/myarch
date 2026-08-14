import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.7) — "approval/rejection." Dual-channel, mirrors
 * ACCOUNT_SIGNUP_DECIDED/REGISTRATION_DECIDED's own "a decision is
 * dual-channel" precedent.
 *
 * Context: { requestId: string, type: string, decision: "APPROVED" | "REJECTED", decisionReason?: string }
 */
export const requestDecidedTemplate: EmailTemplateDefinition = {
  subject: (context) =>
    context.decision === "APPROVED" ? `Your request has been approved` : `Your request has been declined`,
  bodyText: (context) => {
    const typeLabel = String(context.type ?? "request");
    if (context.decision === "APPROVED") return `Your ${typeLabel} request has been approved.`;
    const reason = context.decisionReason ? ` Reason: ${String(context.decisionReason)}` : "";
    return `Your ${typeLabel} request has been declined.${reason}`;
  },
  bodyHtml: (context) => {
    const typeLabel = escapeHtml(String(context.type ?? "request"));
    if (context.decision === "APPROVED") return `<p>Your ${typeLabel} request has been approved.</p>`;
    const reason = context.decisionReason
      ? `<p>Reason: ${escapeHtml(String(context.decisionReason))}</p>`
      : "";
    return `<p>Your ${typeLabel} request has been declined.</p>${reason}`;
  },
};

export const requestDecidedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => (context.decision === "APPROVED" ? "Request approved" : "Request declined"),
  message: (context) =>
    context.decision === "APPROVED" ? "Your request has been approved." : "Your request has been declined.",
};
