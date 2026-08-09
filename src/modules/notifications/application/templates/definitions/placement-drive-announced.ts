import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { companyName: string, title: string, type: "PLACEMENT" | "INTERNSHIP" } */
export const placementDriveAnnouncedTemplate: EmailTemplateDefinition = {
  subject: (context) => `New ${context.type === "INTERNSHIP" ? "internship" : "placement"} opportunity: ${String(context.companyName ?? "")}`,

  bodyText: (context) => {
    const companyName = String(context.companyName ?? "A company");
    const title = String(context.title ?? "a new opportunity");
    const kind = context.type === "INTERNSHIP" ? "internship" : "placement";
    return `${companyName} has announced a new ${kind} opportunity — ${title}.\n\nLog in to TNPArch to view details and apply.`;
  },

  bodyHtml: (context) => {
    const companyName = escapeHtml(String(context.companyName ?? "A company"));
    const title = escapeHtml(String(context.title ?? "a new opportunity"));
    const kind = context.type === "INTERNSHIP" ? "internship" : "placement";
    return `<p><strong>${companyName}</strong> has announced a new ${kind} opportunity — <strong>${title}</strong>.</p><p>Log in to TNPArch to view details and apply.</p>`;
  },
};

export const placementDriveAnnouncedInAppTemplate: InAppTemplateDefinition = {
  title: (context) => `New ${context.type === "INTERNSHIP" ? "internship" : "placement"} opportunity`,
  message: (context) => `${String(context.companyName ?? "A company")} — ${String(context.title ?? "a new opportunity")}`,
};
