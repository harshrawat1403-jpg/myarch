/**
 * Verifies the "PROVIDER CONFIGURATION" architectural requirement:
 * selecting a provider is driven entirely by EMAIL_PROVIDER (validated env
 * config), never a hardcoded value, and swapping providers is a matter of
 * config plus an infrastructure implementation.
 */
import { describe, expect, it } from "vitest";
import { createEmailProvider } from "../../../src/modules/notifications/infrastructure/email-provider-factory";
import { ConsoleEmailProvider } from "../../../src/modules/notifications/infrastructure/console-email-provider";

describe("createEmailProvider", () => {
  it('returns a ConsoleEmailProvider for EMAIL_PROVIDER="console"', () => {
    const provider = createEmailProvider({ EMAIL_PROVIDER: "console" });
    expect(provider).toBeInstanceOf(ConsoleEmailProvider);
  });

  it('throws a clear, actionable error for EMAIL_PROVIDER="resend" (not yet implemented)', () => {
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "resend" })).toThrow(/not implemented/i);
  });

  it('throws a clear, actionable error for EMAIL_PROVIDER="smtp" (not yet implemented)', () => {
    expect(() => createEmailProvider({ EMAIL_PROVIDER: "smtp" })).toThrow(/not implemented/i);
  });
});
