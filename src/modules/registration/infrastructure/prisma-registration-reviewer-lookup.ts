import type { PrismaClient } from "@prisma/client";
import type { RegistrationReviewerLookup } from "../application/ports/registration-reviewer-lookup";

export class PrismaRegistrationReviewerLookup implements RegistrationReviewerLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async listReviewerUserIds(batchId: string): Promise<string[]> {
    const [coordinators, secretaryUserIds] = await Promise.all([
      this.prisma.coordinatorProfile.findMany({
        where: { isActive: true, batchScopes: { some: { batchId } } },
        select: { userId: true },
      }),
      this.listSecretaryUserIds(),
    ]);
    return [...new Set([...coordinators.map((c) => c.userId), ...secretaryUserIds])];
  }

  async listSecretaryUserIds(): Promise<string[]> {
    // SecretaryProfile itself has no isActive column (Secretaries are never
    // deactivated) — matches PrismaSecretaryRecipientLookup's own
    // established convention of filtering on User.isActive instead.
    const secretaries = await this.prisma.user.findMany({
      where: { role: "SECRETARY", isActive: true },
      select: { id: true },
    });
    return secretaries.map((s) => s.id);
  }
}
