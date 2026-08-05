import type { AuditRecorder } from "../../../src/modules/auth/application/ports/audit-recorder";

export interface RecordedAuditEntry {
  actorUserId: string;
  action: string;
  targetEntityType: string;
  targetEntityId: string;
  metadata?: Record<string, unknown>;
}

export class FakeAuditRecorder implements AuditRecorder {
  readonly entries: RecordedAuditEntry[] = [];

  async record(entry: RecordedAuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}
