import type { EmailTemplateDefinition, InAppTemplateDefinition } from "../types";
import { escapeHtml } from "../layout";

/**
 * MYARCH Phase 2 (§3.8) — sent to every active Secretary when a task is
 * escalated, whether manually (EscalateTaskUseCase) or automatically on
 * overdue (TaskOverdueCheckJobHandler). Dual-channel — this is the
 * "Technical Secretary alert" step of roadmap §3.6's own example escalation
 * flow.
 *
 * Context: { taskId: string, title: string }
 */
export const taskEscalatedTemplate: EmailTemplateDefinition = {
  subject: (context) => `Task escalated: ${String(context.title ?? "Untitled task")}`,
  bodyText: (context) => `A task requires your attention: "${String(context.title ?? "Untitled task")}" has been escalated.`,
  bodyHtml: (context) =>
    `<p>A task requires your attention: <strong>${escapeHtml(String(context.title ?? "Untitled task"))}</strong> has been escalated.</p>`,
};

export const taskEscalatedInAppTemplate: InAppTemplateDefinition = {
  title: () => "Task escalated",
  message: (context) => `Escalated: ${String(context.title ?? "Untitled task")}`,
};
