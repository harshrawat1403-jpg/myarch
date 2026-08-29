import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { CommitteeRecord } from "../../../src/modules/committees";
import { EndCommitteeMembershipUseCase } from "../../../src/modules/committees/application/use-cases/end-committee-membership";
import { InMemoryCommitteeRepository } from "../../support/fakes/in-memory-committee-repository";
import { InMemoryCommitteeMembershipRepository } from "../../support/fakes/in-memory-committee-membership-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const OUTSIDER_STUDENT: AuthenticatedActor = { userId: "stu-outsider", role: "STUDENT", studentProfileId: "sp-9" };

function committeeRecord(): CommitteeRecord {
  const now = new Date();
  return {
    id: "committee-1",
    name: "Student Council",
    type: "STUDENT_COUNCIL",
    status: "ACTIVE",
    academicYear: null,
    responsibilities: null,
    startDate: null,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function buildContext() {
  const committeeRepository = new InMemoryCommitteeRepository();
  committeeRepository.seed(committeeRecord());
  const committeeMembershipRepository = new InMemoryCommitteeMembershipRepository();
  const seeded = await committeeMembershipRepository.add({ committeeId: "committee-1", userId: "stu-1", position: "Member" });
  const auditRecorder = new FakeAuditRecorder();
  const useCase = new EndCommitteeMembershipUseCase({ committeeRepository, committeeMembershipRepository, auditRecorder });
  return { useCase, committeeMembershipRepository, seeded };
}

describe("EndCommitteeMembershipUseCase — soft close only, per §5's 'preserve historical membership'", () => {
  it("flips isActive to false and stamps endDate, but never deletes the row", async () => {
    const ctx = await buildContext();
    const ended = await ctx.useCase.execute({ actor: SECRETARY, committeeId: "committee-1", membershipId: ctx.seeded.id });

    expect(ended.isActive).toBe(false);
    expect(ended.endDate).not.toBeNull();

    const stillThere = await ctx.committeeMembershipRepository.findById(ctx.seeded.id);
    expect(stillThere).not.toBeNull();
    expect(stillThere?.userId).toBe("stu-1");
  });

  it("the same user can be re-added after their membership ends (no unique-forever constraint)", async () => {
    const ctx = await buildContext();
    await ctx.useCase.execute({ actor: SECRETARY, committeeId: "committee-1", membershipId: ctx.seeded.id });

    const active = await ctx.committeeMembershipRepository.findActiveByCommitteeAndUser("committee-1", "stu-1");
    expect(active).toBeNull();
  });

  it("denies an outsider Student with no management rights", async () => {
    const ctx = await buildContext();
    await expect(
      ctx.useCase.execute({ actor: OUTSIDER_STUDENT, committeeId: "committee-1", membershipId: ctx.seeded.id }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
