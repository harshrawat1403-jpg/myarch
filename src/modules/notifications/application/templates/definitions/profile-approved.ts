import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/** Context: { studentName: string } */
export const profileApprovedTemplate: EmailTemplateDefinition = {
  subject: () => "Your public profile has been approved",

  bodyText: (context) => {
    const studentName = String(context.studentName ?? "there");
    return (
      `Hi ${studentName},\n\n` +
      "Your public profile has been reviewed and approved. It is now visible to recruiters " +
      "browsing the TNPArch student directory.\n\n" +
      "You can review your published profile anytime by logging in to your TNPArch account."
    );
  },

  bodyHtml: (context) => {
    const studentName = escapeHtml(String(context.studentName ?? "there"));
    return (
      `<p>Hi ${studentName},</p>` +
      "<p>Your public profile has been reviewed and <strong>approved</strong>. It is now visible to " +
      "recruiters browsing the TNPArch student directory.</p>" +
      "<p>You can review your published profile anytime by logging in to your TNPArch account.</p>"
    );
  },
};

export const profileApprovedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Profile approved",
  message: () => "Your public profile has been approved and is now visible to recruiters.",
};
