import type { EmailProvider, RenderedEmailMessage } from "../../../src/modules/notifications/application/ports/email-provider";

export class FakeEmailProvider implements EmailProvider {
  readonly sent: RenderedEmailMessage[] = [];
  shouldThrow = false;

  async send(message: RenderedEmailMessage): Promise<void> {
    if (this.shouldThrow) {
      throw new Error("Simulated provider failure");
    }
    this.sent.push(message);
  }
}
