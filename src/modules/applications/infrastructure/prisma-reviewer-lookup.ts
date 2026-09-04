import type { PrismaClient } from "@prisma/client";
import type { ReviewerLookup, ReviewerAccount, SecretaryRecipientLookup } from "../application/ports/reviewer-lookup";

export class PrismaReviewerLookup implements ReviewerLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<ReviewerAccount | null> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
    return row ? { userId: row.id, role: row.role, isActive: row.isActive } : null;
  }
}

export class PrismaSecretaryRecipientLookup implements SecretaryRecipientLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async listActiveSecretaryUserIds(): Promise<readonly string[]> {
    const rows = await this.prisma.user.findMany({ where: { role: "SECRETARY", isActive: true }, select: { id: true } });
    return rows.map((row) => row.id);
  }
}
