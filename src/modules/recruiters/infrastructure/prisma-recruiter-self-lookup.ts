import type { PrismaClient } from "@prisma/client";
import type { RecruiterSelfLookup } from "../application/ports/recruiter-self-lookup";

export class PrismaRecruiterSelfLookup implements RecruiterSelfLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<{ id: string; companyName: string } | null> {
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { userId }, select: { id: true, companyName: true } });
    return profile;
  }
}
