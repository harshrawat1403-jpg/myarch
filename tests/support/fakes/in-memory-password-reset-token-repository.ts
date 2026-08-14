import crypto from "node:crypto";
import type {
  PasswordResetTokenRepository,
  StoredPasswordResetToken,
} from "../../../src/modules/auth/application/ports/password-reset-token-repository";

export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  private readonly byId = new Map<string, StoredPasswordResetToken>();

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<StoredPasswordResetToken> {
    const row: StoredPasswordResetToken = {
      id: crypto.randomUUID(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      consumedAt: null,
    };
    this.byId.set(row.id, row);
    return row;
  }

  async findByTokenHash(tokenHash: string): Promise<StoredPasswordResetToken | null> {
    for (const row of this.byId.values()) {
      if (row.tokenHash === tokenHash) return row;
    }
    return null;
  }

  async markConsumed(id: string): Promise<void> {
    const row = this.byId.get(id);
    if (!row) return;
    this.byId.set(id, { ...row, consumedAt: new Date() });
  }

  /** Test-only accessor. */
  all(): readonly StoredPasswordResetToken[] {
    return [...this.byId.values()];
  }
}
