import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { studentName: string, decision: "ACCEPTED" | "DECLINED" } — recipient is the recruiter who sent the original interest. */
export const recruiterInterestRespondedTemplate: EmailTemplateDefinition = {
  subject: (context) => (context.decision === "ACCEPTED" ? "A student accepted your interest" : "A student declined your interest"),

  bodyText: (context) => {
    const studentName = String(context.studentName ?? "A student");
    if (context.decision === "ACCEPTED") {
      return (
        `${studentName} has accepted your expression of interest.\n\n` +
        "Per department policy, the platform does not exchange direct contact information — Admin will facilitate the connection."
      );
    }
    return `${studentName} has declined your expression of interest.`;
  },

  bodyHtml: (context) => {
    const studentName = escapeHtml(String(context.studentName ?? "A student"));
    if (context.decision === "ACCEPTED") {
      return (
        `<p><strong>${studentName}</strong> has accepted your expression of interest.</p>` +
        "<p>Per department policy, the platform does not exchange direct contact information — the T&amp;P office will facilitate the connection.</p>"
      );
    }
    return `<p><strong>${studentName}</strong> has declined your expression of interest.</p>`;
  },
};

export const recruiterInterestRespondedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => (context.decision === "ACCEPTED" ? "Interest accepted" : "Interest declined"),
  message: (context) =>
    context.decision === "ACCEPTED"
      ? `${String(context.studentName ?? "A student")} accepted your interest — Admin will facilitate contact.`
      : `${String(context.studentName ?? "A student")} declined your interest.`,
};
