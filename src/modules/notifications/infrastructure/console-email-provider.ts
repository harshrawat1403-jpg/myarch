import type { EmailProvider, RenderedEmailMessage } from "../application/ports/email-provider";

/**
 * The Version 1.0 default (EMAIL_PROVIDER="console" in .env.example) and
 * the only EmailProvider implementation shipped today. Logs instead of
 * sending, so local development and CI never need real email
 * infrastructure. Swapping to a real transport later is adding a sibling
 * class here plus a case in email-provider-factory.ts — no application code
 * changes.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: RenderedEmailMessage): Promise<void> {
    console.log(
      `[notifications:console] to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
  }
}
