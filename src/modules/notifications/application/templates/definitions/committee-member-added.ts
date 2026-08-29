import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 4 (§5) — Council & Committees. Fired once, synchronously,
 * when AddCommitteeMemberUseCase adds a new active membership row.
 *
 * Context: { committeeId: string, committeeName: string, position: string | null }
 */
export const committeeMemberAddedTemplate: EmailTemplateDefinition = {
  subject: (context) => `You've been added to ${String(context.committeeName ?? "a committee")}`,
  bodyText: (context) =>
    `You have been added to ${String(context.committeeName ?? "a committee")}${context.position ? ` as ${String(context.position)}` : ""}.`,
  bodyHtml: (context) =>
    `<p>You have been added to <strong>${escapeHtml(String(context.committeeName ?? "a committee"))}</strong>${
      context.position ? ` as ${escapeHtml(String(context.position))}` : ""
    }.</p>`,
};

export const committeeMemberAddedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Added to a committee",
  message: (context) => String(context.committeeName ?? ""),
};
