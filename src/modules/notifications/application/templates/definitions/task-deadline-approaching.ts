import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.8) — sent to a task's owner when its scheduled
 * reminder fires (TaskReminderJobHandler). Dual-channel: this is exactly
 * the "time-sensitive" category registry.ts's own channel-assignment note
 * describes for deadlines.
 *
 * Context: { taskId: string, title: string }
 */
export const taskDeadlineApproachingTemplate: EmailTemplateDefinition = {
  subject: (context) => `Reminder: "${String(context.title ?? "Untitled task")}" is due soon`,
  bodyText: (context) => `This is a reminder that your task "${String(context.title ?? "Untitled task")}" is due soon.`,
  bodyHtml: (context) =>
    `<p>This is a reminder that your task <strong>${escapeHtml(String(context.title ?? "Untitled task"))}</strong> is due soon.</p>`,
};

export const taskDeadlineApproachingInAppTemplate: InAppTemplateDefinition = {
  title: () => "Task due soon",
  message: (context) => `Due soon: ${String(context.title ?? "Untitled task")}`,
};
