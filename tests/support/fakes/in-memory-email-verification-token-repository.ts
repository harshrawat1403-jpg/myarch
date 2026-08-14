import crypto from "node:crypto";
import type {
  EmailVerificationTokenRepository,
  StoredEmailVerificationToken,
} from "../../../src/modules/auth/application/ports/email-verification-token-repository";

export class InMemoryEmailVerificationTokenRepository implements EmailVerificationTokenRepository {
  private readonly byId = new Map<string, StoredEmailVerificationToken>();

  async create(data: {
    email: string;
    tokenHash: string;
    userId?: string;
    registrationRequestId?: string;
    expiresAt: Date;
  }): Promise<StoredEmailVerificationToken> {
    const row: StoredEmailVerificationToken = {
      id: crypto.randomUUID(),
      email: data.email,
      tokenHash: data.tokenHash,
      userId: data.userId ?? null,
      registrationRequestId: data.registrationRequestId ?? null,
      expiresAt: data.expiresAt,
      consumedAt: null,
    };
    this.byId.set(row.id, row);
    return row;
  }

  async findByTokenHash(tokenHash: string): Promise<StoredEmailVerificationToken | null> {
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

  async findLatestByEmail(email: string): Promise<StoredEmailVerificationToken | null> {
    // Map iterates in insertion order — the last match is the most recently created.
    const matches = [...this.byId.values()].filter((row) => row.email === email);
    return matches.length > 0 ? matches[matches.length - 1]! : null;
  }

  /** Test-only accessor. */
  all(): readonly StoredEmailVerificationToken[] {
    return [...this.byId.values()];
  }
}
