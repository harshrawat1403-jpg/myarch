/**
 * A single rendered email, fully formed and ready to hand to a transport.
 * This is the shape every EmailProvider implementation accepts — it never
 * sees a NotificationTemplateId or a raw context object, only the finished
 * subject/text/html.
 */
export interface RenderedEmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

/**
 * The swap point named in the architecture requirement: "Development Logger
 * → SMTP → SendGrid → Resend → AWS SES should require changing only the
 * infrastructure implementation and environment configuration." Every
 * concrete provider (console logger today; SMTP/SendGrid/Resend/SES later)
 * implements exactly this interface. NotificationService and every business
 * use case depend only on this shape, never on a concrete provider class.
 */
export interface EmailProvider {
  send(message: RenderedEmailMessage): Promise<void>;
}
