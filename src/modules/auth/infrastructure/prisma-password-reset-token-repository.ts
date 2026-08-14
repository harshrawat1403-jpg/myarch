import type { PasswordResetToken } from "@prisma/client";
import type { PrismaTransactionClient } from "@/lib/prisma";
import type {
  PasswordResetTokenRepository,
  StoredPasswordResetToken,
} from "../application/ports/password-reset-token-repository";

export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaTransactionClient) {}

  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<StoredPasswordResetToken> {
    const row = await this.prisma.passwordResetToken.create({ data });
    return toStored(row);
  }

  async findByTokenHash(tokenHash: string): Promise<StoredPasswordResetToken | null> {
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    return row ? toStored(row) : null;
  }

  async markConsumed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }
}

function toStored(row: PasswordResetToken): StoredPasswordResetToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
  };
}
