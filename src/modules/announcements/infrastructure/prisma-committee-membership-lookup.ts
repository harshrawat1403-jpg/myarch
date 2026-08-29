import type { PrismaClient } from "@prisma/client";
import type { CommitteeMembershipLookup } from "../application/ports/committee-membership-lookup";

export class PrismaCommitteeMembershipLookup implements CommitteeMembershipLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async listActiveCommitteeIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.committeeMembership.findMany({
      where: { userId, isActive: true },
      select: { committeeId: true },
    });
    return rows.map((r) => r.committeeId);
  }

  async isActiveStudentCouncilMember(userId: string): Promise<boolean> {
    const count = await this.prisma.committeeMembership.count({
      where: { userId, isActive: true, committee: { type: "STUDENT_COUNCIL" } },
    });
    return count > 0;
  }
}
