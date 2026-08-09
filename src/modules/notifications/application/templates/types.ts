/**
 * A template definition supplies only its own content — subject line, plain
 * text body, and HTML body. It never renders branding or a footer; those
 * are applied uniformly by layout.ts so every email looks consistent
 * without each template duplicating that markup. A future "Version 2.0 Rich
 * Email Builder" can keep reusing these bodyHtml()/bodyText() functions
 * while swapping only the layout wrapper, or vice versa — the two concerns
 * never need to change together.
 */
export interface EmailTemplateDefinition {
  subject(context: Record<string, unknown>): string;
  bodyText(context: Record<string, unknown>): string;
  bodyHtml(context: Record<string, unknown>): string;
}

/**
 * V4.0 E1 — the IN_APP counterpart to EmailTemplateDefinition. Deliberately
 * much smaller: a notification-center row is one line of title plus one
 * line of message, not a full email with subject/text/html variants.
 */
export interface InAppTemplateDefinition {
  title(context: Record<string, unknown>): string;
  message(context: Record<string, unknown>): string;
}
