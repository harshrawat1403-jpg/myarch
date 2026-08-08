import crypto from "node:crypto";
import type {
  RefreshTokenRepository,
  StoredRefreshToken,
} from "../../../src/modules/auth/application/ports/refresh-token-repository";

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly byId = new Map<string, StoredRefreshToken>();

  async create(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<StoredRefreshToken> {
    const row: StoredRefreshToken = {
      id: crypto.randomUUID(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      familyId: data.familyId,
      expiresAt: data.expiresAt,
      revokedAt: null,
      replacedById: null,
    };
    this.byId.set(row.id, row);
    return row;
  }

  async findByTokenHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    for (const row of this.byId.values()) {
      if (row.tokenHash === tokenHash) return row;
    }
    return null;
  }

  async revoke(id: string, replacedById?: string): Promise<void> {
    const row = this.byId.get(id);
    if (!row) return;
    this.byId.set(id, { ...row, revokedAt: new Date(), replacedById: replacedById ?? null });
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const [id, row] of this.byId.entries()) {
      if (row.familyId === familyId && !row.revokedAt) {
        this.byId.set(id, { ...row, revokedAt: new Date() });
      }
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const [id, row] of this.byId.entries()) {
      if (row.userId === userId && !row.revokedAt) {
        this.byId.set(id, { ...row, revokedAt: new Date() });
      }
    }
  }

  /** Test-only accessor for asserting on stored state directly. */
  all(): readonly StoredRefreshToken[] {
    return [...this.byId.values()];
  }
}
