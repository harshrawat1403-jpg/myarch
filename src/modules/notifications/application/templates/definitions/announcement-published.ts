import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 3 (§4.5) — Announcements. Fires once, at creation time, only
 * for an immediately-active announcement (publishAt <= now) — see
 * CreateAnnouncementUseCase's own doc comment for why a future-dated
 * publishAt does not notify yet (no scheduled-dispatch subsystem exists;
 * this mirrors DEADLINE_REMINDER's own documented deferral in this file's
 * sibling registry.ts).
 *
 * Context: { announcementId: string, title: string }
 */
export const announcementPublishedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Announcement: ${String(context.title ?? "")}`,
  bodyText: (context) => `A new announcement has been published: ${String(context.title ?? "")}.`,
  bodyHtml: (context) => `<p>A new announcement has been published: <strong>${escapeHtml(String(context.title ?? ""))}</strong>.</p>`,
};

export const announcementPublishedInAppTemplate: InAppTemplateDefinition = {
  title: () => "New announcement",
  message: (context) => String(context.title ?? ""),
};
