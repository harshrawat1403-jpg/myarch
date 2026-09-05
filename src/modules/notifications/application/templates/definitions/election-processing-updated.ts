import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

export const electionProcessingUpdatedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Election candidacy update: ${String(context.title)}`,
  bodyText: (context) => `${String(context.message)} View your election candidacy in the student dashboard.`,
  bodyHtml: (context) => `<p>${escapeHtml(String(context.message))}</p><p>View your election candidacy in the student dashboard.</p>`,
};
export const electionProcessingUpdatedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Election candidacy update",
  message: (context) => String(context.message),
};
