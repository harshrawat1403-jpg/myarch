import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.8) — sent to a task's new owner on reassignment.
 * IN_APP-only, same routine-event reasoning as TASK_ASSIGNED.
 *
 * Context: { taskId: string, title: string }
 */
export const taskReassignedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Task reassigned to you: ${String(context.title ?? "Untitled task")}`,
  bodyText: (context) => `A task has been reassigned to you: "${String(context.title ?? "Untitled task")}".`,
  bodyHtml: (context) =>
    `<p>A task has been reassigned to you: <strong>${escapeHtml(String(context.title ?? "Untitled task"))}</strong>.</p>`,
};

export const taskReassignedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Task reassigned to you",
  message: (context) => `Reassigned to you: ${String(context.title ?? "Untitled task")}`,
};
