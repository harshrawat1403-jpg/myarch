import type { EmailVerificationToken } from "@prisma/client";
import type { PrismaTransactionClient } from "@/lib/prisma";
import type {
  EmailVerificationTokenRepository,
  StoredEmailVerificationToken,
} from "../application/ports/email-verification-token-repository";

export class PrismaEmailVerificationTokenRepository implements EmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaTransactionClient) {}

  async create(data: {
    email: string;
    tokenHash: string;
    userId?: string;
    registrationRequestId?: string;
    expiresAt: Date;
  }): Promise<StoredEmailVerificationToken> {
    const row = await this.prisma.emailVerificationToken.create({
      data: {
        email: data.email,
        tokenHash: data.tokenHash,
        userId: data.userId,
        registrationRequestId: data.registrationRequestId,
        expiresAt: data.expiresAt,
      },
    });
    return toStored(row);
  }

  async findByTokenHash(tokenHash: string): Promise<StoredEmailVerificationToken | null> {
    const row = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    return row ? toStored(row) : null;
  }

  async markConsumed(id: string): Promise<void> {
    await this.prisma.emailVerificationToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async findLatestByEmail(email: string): Promise<StoredEmailVerificationToken | null> {
    const row = await this.prisma.emailVerificationToken.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
    return row ? toStored(row) : null;
  }
}

function toStored(row: EmailVerificationToken): StoredEmailVerificationToken {
  return {
    id: row.id,
    email: row.email,
    tokenHash: row.tokenHash,
    userId: row.userId,
    registrationRequestId: row.registrationRequestId,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
  };
}
