import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { companyName: string, title: string, toStatus: string } */
export const applicationStatusChangedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Application update: ${String(context.companyName ?? "your application")}`,

  bodyText: (context) => {
    const companyName = String(context.companyName ?? "A company");
    const title = String(context.title ?? "your application");
    const toStatus = String(context.toStatus ?? "updated");
    return `Your application to ${companyName} — ${title} — is now ${toStatus}.\n\nLog in to TNPArch for details.`;
  },

  bodyHtml: (context) => {
    const companyName = escapeHtml(String(context.companyName ?? "A company"));
    const title = escapeHtml(String(context.title ?? "your application"));
    const toStatus = escapeHtml(String(context.toStatus ?? "updated"));
    return `<p>Your application to <strong>${companyName}</strong> — ${title} — is now <strong>${toStatus}</strong>.</p><p>Log in to TNPArch for details.</p>`;
  },
};

export const applicationStatusChangedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => `Application ${String(context.toStatus ?? "updated").toLowerCase()}`,
  message: (context) => `${String(context.companyName ?? "A company")} — ${String(context.title ?? "your application")}`,
};
