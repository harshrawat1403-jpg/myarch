import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.8) — sent to a task's owner when TaskOverdueCheckJobHandler
 * finds it still open past its deadline (immediately before auto-escalating
 * to the Technical Secretary). Dual-channel — time-sensitive.
 *
 * Context: { taskId: string, title: string }
 */
export const taskOverdueTemplate: EmailTemplateDefinition = {
  subject: (context) => `Overdue: "${String(context.title ?? "Untitled task")}"`,
  bodyText: (context) =>
    `Your task "${String(context.title ?? "Untitled task")}" is now overdue and has been escalated.`,
  bodyHtml: (context) =>
    `<p>Your task <strong>${escapeHtml(String(context.title ?? "Untitled task"))}</strong> is now overdue and has been escalated.</p>`,
};

export const taskOverdueInAppTemplate: InAppTemplateDefinition = {
  title: () => "Task overdue",
  message: (context) => `Overdue: ${String(context.title ?? "Untitled task")}`,
};
