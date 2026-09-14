/**
 * Verifies the "PROVIDER CONFIGURATION" architectural requirement:
 * selecting a provider is driven entirely by EMAIL_PROVIDER (validated env
 * config), never a hardcoded value, and swapping providers is a matter of
 * config plus an infrastructure implementation.
 */
import { describe, expect, it } from "vitest";
import { createEmailProvider } from "../../../src/modules/notifications/infrastructure/email-provider-factory";
import { ConsoleEmailProvider } from "../../../src/modules/notifications/infrastructure/console-email-provider";
import { ResendEmailProvider } from "../../../src/modules/notifications/infrastructure/resend-email-provider";

describe("createEmailProvider", () => {
  it('returns a ConsoleEmailProvider for EMAIL_PROVIDER="console"', () => {
    const provider = createEmailProvider({
      EMAIL_PROVIDER: "console",
      EMAIL_FROM_ADDRESS: "noreply@myarch.in",
    });
    expect(provider).toBeInstanceOf(ConsoleEmailProvider);
  });

  it('returns a ResendEmailProvider for EMAIL_PROVIDER="resend" when RESEND_API_KEY is set', () => {
    const provider = createEmailProvider({
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM_ADDRESS: "noreply@myarch.in",
      RESEND_API_KEY: "re_test_key",
    });
    expect(provider).toBeInstanceOf(ResendEmailProvider);
  });

  it('throws a clear, actionable error for EMAIL_PROVIDER="resend" with no RESEND_API_KEY (regression: this is exactly the misconfiguration that silently dropped password-reset/verification emails)', () => {
    expect(() =>
      createEmailProvider({ EMAIL_PROVIDER: "resend", EMAIL_FROM_ADDRESS: "noreply@myarch.in" }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('throws a clear, actionable error for EMAIL_PROVIDER="smtp" (not yet implemented)', () => {
    expect(() =>
      createEmailProvider({ EMAIL_PROVIDER: "smtp", EMAIL_FROM_ADDRESS: "noreply@myarch.in" }),
    ).toThrow(/not implemented/i);
  });
});
