import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";
export const electionApplicationOpenedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Applications open: ${String(context.title)}`,
  bodyText: (context) =>
    `${String(context.title)} applications are open until ${String(context.deadline)}. View Elections in your student dashboard.`,
  bodyHtml: (context) =>
    `<p>Applications for ${escapeHtml(String(context.title))} are open until ${escapeHtml(String(context.deadline))}. View Elections in your student dashboard.</p>`,
};
export const electionApplicationOpenedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Election applications open",
  message: (context) => `${String(context.title)} — apply by ${String(context.deadline)}`,
};
