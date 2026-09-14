import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { applicantName: string, status: "REVIEWED" | "NEEDS_ATTENTION" } — recipients are every Secretary (the eventual decision-maker). */
export const registrationReviewedTemplate: EmailTemplateDefinition = {
  subject: (context) =>
    context.status === "NEEDS_ATTENTION" ? "Registration request flagged: needs attention" : "Registration request reviewed",

  bodyText: (context) => {
    const applicantName = String(context.applicantName ?? "A registration request");
    const needsAttention = context.status === "NEEDS_ATTENTION";
    return needsAttention
      ? `A Coordinator has flagged ${applicantName}'s registration request as needing attention. Please log in to MYARCH to review their comment.`
      : `A Coordinator has reviewed ${applicantName}'s registration request. It's ready for your decision in MYARCH.`;
  },

  bodyHtml: (context) => {
    const applicantName = escapeHtml(String(context.applicantName ?? "A registration request"));
    const needsAttention = context.status === "NEEDS_ATTENTION";
    return needsAttention
      ? `<p>A Coordinator has flagged <strong>${applicantName}</strong>'s registration request as needing attention. Please log in to MYARCH to review their comment.</p>`
      : `<p>A Coordinator has reviewed <strong>${applicantName}</strong>'s registration request. It's ready for your decision in MYARCH.</p>`;
  },
};

export const registrationReviewedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => (context.status === "NEEDS_ATTENTION" ? "Registration needs attention" : "Registration reviewed"),
  message: (context) =>
    context.status === "NEEDS_ATTENTION"
      ? `${String(context.applicantName ?? "A registration request")} was flagged as needing attention.`
      : `${String(context.applicantName ?? "A registration request")} is ready for your decision.`,
};
