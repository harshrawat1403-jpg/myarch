import type { PrismaClient } from "@prisma/client";
import type { ExistingAccountLookup } from "../application/ports/existing-account-lookup";

export class PrismaExistingAccountLookup implements ExistingAccountLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async emailInUse(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email: { equals: email, mode: "insensitive" } } });
    return count > 0;
  }

  async rollNumberInUse(rollNumber: string): Promise<boolean> {
    const count = await this.prisma.studentProfile.count({
      where: { rollNumber: { equals: rollNumber, mode: "insensitive" } },
    });
    return count > 0;
  }
}
