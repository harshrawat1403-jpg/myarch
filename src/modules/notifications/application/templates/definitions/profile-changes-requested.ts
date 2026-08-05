import type { EmailTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { studentName: string; reviewComment: string } */
export const profileChangesRequestedTemplate: EmailTemplateDefinition = {
  subject: () => "Changes requested on your public profile",

  bodyText: (context) => {
    const studentName = String(context.studentName ?? "there");
    const reviewComment = String(context.reviewComment ?? "");
    return (
      `Hi ${studentName},\n\n` +
      "A reviewer has requested changes to your public profile draft before it can be approved.\n\n" +
      `Reviewer comment:\n${reviewComment}\n\n` +
      "Please log in to your TNPArch account, update your draft, and resubmit it for review."
    );
  },

  bodyHtml: (context) => {
    const studentName = escapeHtml(String(context.studentName ?? "there"));
    const reviewComment = escapeHtml(String(context.reviewComment ?? ""));
    return (
      `<p>Hi ${studentName},</p>` +
      "<p>A reviewer has requested changes to your public profile draft before it can be approved.</p>" +
      `<p><strong>Reviewer comment:</strong><br />${reviewComment}</p>` +
      "<p>Please log in to your TNPArch account, update your draft, and resubmit it for review.</p>"
    );
  },
};
