import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.4) — "When resolved: notify complainant." Dual-channel:
 * this is exactly the "time-sensitive, off-platform-relevant" category the
 * notifications registry's own channel-assignment note describes.
 *
 * Context: { issueId: string, location: string }
 */
export const maintenanceIssueResolvedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Your maintenance issue at ${String(context.location ?? "")} has been resolved`,
  bodyText: (context) =>
    `Your reported maintenance issue at ${String(context.location ?? "the reported location")} has been marked resolved. Please review the resolution details and confirm, or reopen it if the problem persists.`,
  bodyHtml: (context) =>
    `<p>Your reported maintenance issue at <strong>${escapeHtml(String(context.location ?? "the reported location"))}</strong> has been marked resolved.</p><p>Please review the resolution details and confirm, or reopen it if the problem persists.</p>`,
};

export const maintenanceIssueResolvedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Your issue was resolved",
  message: (context) => `Resolved: your report at ${String(context.location ?? "")}`,
};
