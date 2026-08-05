import type { JobLogger } from "../application/ports/job-logger";

/**
 * Version 1.0 default JobLogger: one JSON line per event, so it's already
 * machine-parseable by any log aggregator (CloudWatch, Datadog, etc.)
 * without further changes here. Swapping to pino/winston later is a new
 * JobLogger implementation.
 */
export class ConsoleJobLogger implements JobLogger {
  info(event: string, fields: Record<string, unknown> = {}): void {
    this.write("info", event, fields);
  }

  warn(event: string, fields: Record<string, unknown> = {}): void {
    this.write("warn", event, fields);
  }

  error(event: string, fields: Record<string, unknown> = {}): void {
    this.write("error", event, fields);
  }

  private write(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown>): void {
    const line = JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...fields });
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
