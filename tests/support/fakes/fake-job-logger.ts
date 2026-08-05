import type { JobLogger } from "../../../src/modules/jobs";

export interface RecordedLogEntry {
  level: "info" | "warn" | "error";
  event: string;
  fields: Record<string, unknown>;
}

export class FakeJobLogger implements JobLogger {
  readonly entries: RecordedLogEntry[] = [];

  info(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: "info", event, fields });
  }

  warn(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: "warn", event, fields });
  }

  error(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: "error", event, fields });
  }
}
