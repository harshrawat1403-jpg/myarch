import { describe, expect, it } from "vitest";
import { NotAuthorizedError } from "../../../src/lib/errors";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import type { CommitteeRecord } from "../../../src/modules/committees";
import { AddCommitteeMemberUseCase } from "../../../src/modules/committees/application/use-cases/add-committee-member";
import { DuplicateCommitteeMembershipError } from "../../../src/modules/committees/domain/errors";
import { InMemoryCommitteeRepository } from "../../support/fakes/in-memory-committee-repository";
import { InMemoryCommitteeMembershipRepository } from "../../support/fakes/in-memory-committee-membership-repository";
import { FakeAuditRecorder } from "../../support/fakes/fake-audit-recorder";
import { FakeNotificationService } from "../../support/fakes/fake-notification-service";

const SECRETARY: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const OUTSIDER_STUDENT: AuthenticatedActor = { userId: "stu-outsider", role: "STUDENT", studentProfileId: "sp-1" };

function committeeRecord(overrides: Partial<CommitteeRecord> = {}): CommitteeRecord {
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
    ...overrides,
  };
}

function buildContext() {
  const committeeRepository = new InMemoryCommitteeRepository();
  committeeRepository.seed(committeeRecord());
  const committeeMembershipRepository = new InMemoryCommitteeMembershipRepository();
  const auditRecorder = new FakeAuditRecorder();
  const notificationService = new FakeNotificationService();
  const useCase = new AddCommitteeMemberUseCase({
    committeeRepository,
    committeeMembershipRepository,
    auditRecorder,
    notificationService,
  });
  return { useCase, committeeMembershipRepository, notificationService };
}

describe("AddCommitteeMemberUseCase", () => {
  it("adds an active member and notifies them", async () => {
    const ctx = buildContext();
    const membership = await ctx.useCase.execute({
      actor: SECRETARY,
      committeeId: "committee-1",
      userId: "stu-1",
      position: "President",
      isLead: true,
    });

    expect(membership.isActive).toBe(true);
    expect(membership.position).toBe("President");
    expect(membership.isLead).toBe(true);
    expect(ctx.notificationService.sent).toContainEqual(
      expect.objectContaining({ recipientUserId: "stu-1", template: "COMMITTEE_MEMBER_ADDED" }),
    );
  });

  it("rejects a duplicate active membership for the same user on the same committee", async () => {
    const ctx = buildContext();
    await ctx.useCase.execute({ actor: SECRETARY, committeeId: "committee-1", userId: "stu-1" });

    await expect(
      ctx.useCase.execute({ actor: SECRETARY, committeeId: "committee-1", userId: "stu-1" }),
    ).rejects.toBeInstanceOf(DuplicateCommitteeMembershipError);
  });

  it("denies an outsider Student with no management rights", async () => {
    const ctx = buildContext();
    await expect(
      ctx.useCase.execute({ actor: OUTSIDER_STUDENT, committeeId: "committee-1", userId: "stu-1" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("allows a committee's own active lead to add a new member", async () => {
    const ctx = buildContext();
    await ctx.committeeMembershipRepository.add({ committeeId: "committee-1", userId: "stu-lead", isLead: true });

    const LEAD: AuthenticatedActor = { userId: "stu-lead", role: "STUDENT", studentProfileId: "sp-lead" };
    const membership = await ctx.useCase.execute({ actor: LEAD, committeeId: "committee-1", userId: "stu-2" });
    expect(membership.userId).toBe("stu-2");
  });
});
