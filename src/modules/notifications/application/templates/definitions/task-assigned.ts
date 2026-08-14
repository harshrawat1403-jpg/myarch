import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.8) — sent to a task's owner the moment it's created
 * with someone other than the creator as owner. Routine, high-frequency
 * once the Task Engine has real callers — IN_APP-only, mirroring
 * REGISTRATION_SUBMITTED's own "routine, keep email volume down" precedent.
 *
 * Context: { taskId: string, title: string }
 */
export const taskAssignedTemplate: EmailTemplateDefinition = {
  subject: (context) => `New task assigned: ${String(context.title ?? "Untitled task")}`,
  bodyText: (context) => `You've been assigned a new task: "${String(context.title ?? "Untitled task")}".`,
  bodyHtml: (context) =>
    `<p>You've been assigned a new task: <strong>${escapeHtml(String(context.title ?? "Untitled task"))}</strong>.</p>`,
};

export const taskAssignedInAppTemplate: InAppTemplateDefinition = {
  title: () => "New task assigned",
  message: (context) => `You've been assigned: ${String(context.title ?? "Untitled task")}`,
};
