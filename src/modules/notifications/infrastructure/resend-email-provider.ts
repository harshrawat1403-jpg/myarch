import type { EmailProvider, RenderedEmailMessage } from "../application/ports/email-provider";

/**
 * The Resend REST API transport — the provider email-provider-factory.ts's
 * own doc comment names as the swap-in point once a real provider is
 * implemented. Plain `fetch` against Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email)
 * rather than the `resend` npm package, to avoid adding a new dependency for
 * a single POST request with a well-documented, stable shape.
 */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
  ) {}

  async send(message: RenderedEmailMessage): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      // Never includes the API key; the response body is Resend's own error
      // description (e.g. invalid recipient, unverified sending domain),
      // safe to surface in a thrown Error caught by every call site's own
      // best-effort .catch().
      const body = await response.text().catch(() => "");
      throw new Error(`Resend API request failed with status ${response.status}: ${body}`);
    }
  }
}
