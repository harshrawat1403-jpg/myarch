import crypto from "node:crypto";
import type {
  AvatarFileRecord,
  AvatarFileRepository,
  CreateAvatarFileInput,
} from "../../../src/modules/auth/application/ports/avatar-file-repository";

export class FakeAvatarFileRepository implements AvatarFileRepository {
  private readonly byId = new Map<string, AvatarFileRecord>();

  async create(input: CreateAvatarFileInput): Promise<AvatarFileRecord> {
    const record: AvatarFileRecord = { id: crypto.randomUUID(), ...input };
    this.byId.set(record.id, record);
    return record;
  }

  async findById(fileId: string): Promise<AvatarFileRecord | null> {
    return this.byId.get(fileId) ?? null;
  }

  async delete(fileId: string): Promise<void> {
    this.byId.delete(fileId);
  }

  /** Test-only accessor. */
  all(): readonly AvatarFileRecord[] {
    return [...this.byId.values()];
  }
}
