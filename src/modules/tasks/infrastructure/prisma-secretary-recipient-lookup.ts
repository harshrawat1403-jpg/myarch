import type { PrismaClient } from "@prisma/client";
import type { SecretaryRecipientLookup } from "../application/ports/secretary-recipient-lookup";

export class PrismaSecretaryRecipientLookup implements SecretaryRecipientLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async listActiveSecretaryUserIds(): Promise<string[]> {
    const secretaries = await this.prisma.user.findMany({
      where: { role: "SECRETARY", isActive: true },
      select: { id: true },
    });
    return secretaries.map((s) => s.id);
  }
}
