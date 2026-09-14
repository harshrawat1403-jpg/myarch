import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { companyName: string } — never carries recruiter identity beyond the company name (§8 — no direct contact info exchange). */
export const recruiterInterestReceivedTemplate: EmailTemplateDefinition = {
  subject: (context) => `${String(context.companyName ?? "A recruiter")} is interested in your profile`,

  bodyText: (context) => {
    const companyName = String(context.companyName ?? "A recruiter");
    return (
      `${companyName} has expressed interest in your public profile.\n\n` +
      "Log in to MYARCH and visit My Interests to accept or decline."
    );
  },

  bodyHtml: (context) => {
    const companyName = escapeHtml(String(context.companyName ?? "A recruiter"));
    return (
      `<p><strong>${companyName}</strong> has expressed interest in your public profile.</p>` +
      "<p>Log in to MYARCH and visit My Interests to accept or decline.</p>"
    );
  },
};

export const recruiterInterestReceivedInAppTemplate: InAppTemplateDefinition = {
  title: () => "New recruiter interest",
  message: (context) => `${String(context.companyName ?? "A recruiter")} is interested in your profile.`,
};
