import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { studentName: string, companyName: string } */
export const interestFacilitationRequiredTemplate: EmailTemplateDefinition = {
  subject: (context) => `Facilitation needed: ${String(context.studentName ?? "a student")} accepted a recruiter's interest`,

  bodyText: (context) => {
    const studentName = String(context.studentName ?? "A student");
    const companyName = String(context.companyName ?? "A recruiter");
    return (
      `${studentName} has accepted an expression of interest from ${companyName}.\n\n` +
      "Per department policy, the platform does not exchange direct contact information between " +
      "students and recruiters. Please facilitate the connection between them."
    );
  },

  bodyHtml: (context) => {
    const studentName = escapeHtml(String(context.studentName ?? "A student"));
    const companyName = escapeHtml(String(context.companyName ?? "A recruiter"));
    return (
      `<p><strong>${studentName}</strong> has accepted an expression of interest from <strong>${companyName}</strong>.</p>` +
      "<p>Per department policy, the platform does not exchange direct contact information between " +
      "students and recruiters. Please facilitate the connection between them.</p>"
    );
  },
};

export const interestFacilitationRequiredInAppTemplate: InAppTemplateDefinition = {
  title: () => "Facilitation needed",
  message: (context) =>
    `${String(context.studentName ?? "A student")} accepted an interest from ${String(context.companyName ?? "a recruiter")} — please facilitate the connection.`,
};
