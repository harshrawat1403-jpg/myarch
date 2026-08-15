import type { Env } from "@/config/env";
import type { EmailProvider } from "../application/ports/email-provider";
import { ConsoleEmailProvider } from "./console-email-provider";
import { ResendEmailProvider } from "./resend-email-provider";

/**
 * PROVIDER CONFIGURATION (architectural requirement): "Changing from
 * Development Logger → SMTP → SendGrid → Resend → AWS SES should require
 * changing only the infrastructure implementation and environment
 * configuration. Application code should remain unchanged." This switch is
 * that swap point — every case reads only from validated env config, never
 * a hardcoded value, and nothing outside this file (or container.ts, which
 * calls it) knows which case is active.
 *
 * "smtp" is accepted by src/config/env.ts (matching .env.example's
 * documented options) but still not implemented — the production email
 * provider remains an open decision for that transport specifically
 * (docs/planning/18_Open_Questions.md, Q2). "resend" IS implemented (see
 * ResendEmailProvider) — RESEND_API_KEY/EMAIL_FROM_ADDRESS are the only
 * config it needs. Implementing SMTP is adding a new class here plus a new
 * case below; it does not touch DefaultNotificationService or any business
 * use case.
 */
export function createEmailProvider(
  env: Pick<Env, "EMAIL_PROVIDER" | "RESEND_API_KEY" | "EMAIL_FROM_ADDRESS">,
): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "console":
      return new ConsoleEmailProvider();
    case "resend":
      if (!env.RESEND_API_KEY) {
        throw new Error('EMAIL_PROVIDER="resend" requires RESEND_API_KEY to be set.');
      }
      return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS);
    case "smtp":
      throw new Error(
        `EMAIL_PROVIDER="smtp" is not implemented in Version 1.0 (docs/planning/18_Open_Questions.md, Q2 is still open). Use "console" or "resend" today.`,
      );
    default:
      return env.EMAIL_PROVIDER satisfies never;
  }
}
