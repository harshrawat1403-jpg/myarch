import type { Env } from "@/config/env";
import type { EmailProvider } from "../application/ports/email-provider";
import { ConsoleEmailProvider } from "./console-email-provider";

/**
 * PROVIDER CONFIGURATION (architectural requirement): "Changing from
 * Development Logger → SMTP → SendGrid → Resend → AWS SES should require
 * changing only the infrastructure implementation and environment
 * configuration. Application code should remain unchanged." This switch is
 * that swap point — every case reads only from validated env config, never
 * a hardcoded value, and nothing outside this file (or container.ts, which
 * calls it) knows which case is active.
 *
 * "smtp"/"resend" are accepted by src/config/env.ts (matching
 * .env.example's documented options) but not implemented yet — the
 * production email provider remains an open decision
 * (docs/planning/18_Open_Questions.md, Q2). Implementing one is adding a
 * new class here plus a new case below; it does not touch
 * DefaultNotificationService or any business use case.
 */
export function createEmailProvider(env: Pick<Env, "EMAIL_PROVIDER">): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "console":
      return new ConsoleEmailProvider();
    case "resend":
    case "smtp":
      throw new Error(
        `EMAIL_PROVIDER="${env.EMAIL_PROVIDER}" is not implemented in Version 1.0 (docs/planning/18_Open_Questions.md, Q2 is still open). Only "console" is available today.`,
      );
    default:
      return env.EMAIL_PROVIDER satisfies never;
  }
}
