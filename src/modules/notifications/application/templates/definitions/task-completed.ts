import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.8) — sent to a task's creator when its owner marks it
 * DONE (never sent if the creator completed their own task). Routine —
 * IN_APP-only.
 *
 * Context: { taskId: string, title: string }
 */
export const taskCompletedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Task completed: ${String(context.title ?? "Untitled task")}`,
  bodyText: (context) => `The task "${String(context.title ?? "Untitled task")}" has been marked complete.`,
  bodyHtml: (context) =>
    `<p>The task <strong>${escapeHtml(String(context.title ?? "Untitled task"))}</strong> has been marked complete.</p>`,
};

export const taskCompletedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Task completed",
  message: (context) => `Completed: ${String(context.title ?? "Untitled task")}`,
};
