import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { applicantName: string, batchName: string } — recipients are every Coordinator scoped to the batch, plus every Secretary. */
export const registrationSubmittedTemplate: EmailTemplateDefinition = {
  subject: () => "New registration request awaiting review",

  bodyText: (context) => {
    const applicantName = String(context.applicantName ?? "A prospective student");
    const batchName = String(context.batchName ?? "a batch");
    return (
      `${applicantName} has submitted a registration request for ${batchName}.\n\n` +
      "Please log in to TNPArch to review it."
    );
  },

  bodyHtml: (context) => {
    const applicantName = escapeHtml(String(context.applicantName ?? "A prospective student"));
    const batchName = escapeHtml(String(context.batchName ?? "a batch"));
    return (
      `<p><strong>${applicantName}</strong> has submitted a registration request for <strong>${batchName}</strong>.</p>` +
      "<p>Please log in to TNPArch to review it.</p>"
    );
  },
};

export const registrationSubmittedInAppTemplate: InAppTemplateDefinition = {
  title: () => "New registration request",
  message: (context) =>
    `${String(context.applicantName ?? "A prospective student")} submitted a registration request for ${String(context.batchName ?? "a batch")}.`,
};
