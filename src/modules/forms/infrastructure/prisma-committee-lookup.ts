import type { PrismaClient } from "@prisma/client";
import type { CommitteeLookup } from "../application/ports/committee-lookup";

export class PrismaCommitteeLookup implements CommitteeLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async exists(id: string): Promise<boolean> {
    const committee = await this.prisma.committee.findUnique({ where: { id }, select: { id: true } });
    return Boolean(committee);
  }
}

