import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaCoreCommitteeSelectionRepository,
  associateCoreCommitteeSelectionCandidate,
} from "../../../src/modules/selections/infrastructure/prisma-core-committee-selection-repository";
import { PrismaFormApplicationRepository } from "../../../src/modules/applications/infrastructure/prisma-application-repository";

const databaseUrl = process.env.ELECTION_TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (url.hostname !== "127.0.0.1" || url.port !== "15432")
    throw new Error("Selection database tests require only 127.0.0.1:15432");
}
describe.skipIf(!databaseUrl)("Core Committee selection PostgreSQL integrity", () => {
  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl ?? "postgresql://unused:unused@127.0.0.1:15432/unused",
  });
  const repository = new PrismaCoreCommitteeSelectionRepository(prisma);
  const applications = new PrismaFormApplicationRepository(
    prisma,
    associateCoreCommitteeSelectionCandidate,
  );
  const selectionIds: string[] = [],
    formIds: string[] = [],
    userIds: string[] = [],
    committeeIds: string[] = [];
  let secretaryId: string,
    studentId: string,
    studentProfileId: string,
    councilMemberId: string,
    batchId: string;
  beforeAll(async () => {
    await prisma.$connect();
    const secretary = await prisma.user.create({
      data: {
        email: `core-secretary-${randomUUID()}@test.invalid`,
        passwordHash: "test",
        role: "SECRETARY",
      },
    });
    const student = await prisma.user.create({
      data: {
        email: `core-student-${randomUUID()}@test.invalid`,
        passwordHash: "test",
        role: "STUDENT",
      },
    });
    const councilMember = await prisma.user.create({
      data: {
        email: `core-council-${randomUUID()}@test.invalid`,
        passwordHash: "test",
        role: "STUDENT",
      },
    });
    const batch = await prisma.batch.create({
      data: { name: `Core test ${randomUUID()}`, year: 2026 },
    });
    await prisma.studentProfile.create({
      data: {
        userId: student.id,
        fullName: "Core Test Student",
        rollNumber: randomUUID(),
        batchId: batch.id,
      },
    });
    secretaryId = secretary.id;
    studentId = student.id;
    councilMemberId = councilMember.id;
    batchId = batch.id;
    userIds.push(secretaryId, studentId, councilMemberId);
    studentProfileId = (
      await prisma.studentProfile.findUniqueOrThrow({ where: { userId: studentId } })
    ).id;
  });
  afterAll(async () => {
    await prisma.coreCommitteeSelectionDecision.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeCouncilReview.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelectionInterview.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelectionShortlistEntry.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelectionCorrectionRequest.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelectionScrutinyReview.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelectionCandidatePosition.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelectionCandidate.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelectionApplicationForm.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelectionPosition.deleteMany({
      where: { selectionId: { in: selectionIds } },
    });
    await prisma.coreCommitteeSelection.deleteMany({ where: { id: { in: selectionIds } } });
    await prisma.form.deleteMany({ where: { id: { in: formIds } } });
    await prisma.committeeMembership.deleteMany({ where: { committeeId: { in: committeeIds } } });
    await prisma.committee.deleteMany({ where: { id: { in: committeeIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.batch.delete({ where: { id: batchId } });
    await prisma.$disconnect();
  });
  async function fixture(link = true) {
    const selection = await repository.create(
      {
        title: "Core selection",
        academicYear: "2026-2027",
        applicationOpenAt: new Date(Date.now() - 60000),
        applicationCloseAt: new Date(Date.now() + 3600000),
        correctionOpenAt: null,
        correctionCloseAt: null,
        maxPositionsPerCandidate: 1,
      },
      secretaryId,
    );
    selectionIds.push(selection.id);
    const positioned = await repository.savePosition(
      selection.id,
      null,
      { title: "Design Lead", description: "", seats: 1, displayOrder: 0 },
      secretaryId,
    );
    const form = await prisma.form.create({
      data: {
        title: "Core application",
        status: "PUBLISHED",
        createdByUserId: secretaryId,
        fields: {
          create: { key: "motivation", label: "Motivation", type: "TEXT", displayOrder: 0 },
        },
      },
    });
    formIds.push(form.id);
    if (link) {
      await repository.linkForm(selection.id, form.id, secretaryId);
      await repository.transition(selection.id, "APPLICATION_OPEN", secretaryId);
    }
    return { selection, form, position: positioned.positions[0]! };
  }
  it("creates a candidate only for an explicitly associated form and preserves generic applications", async () => {
    const generic = await fixture(false);
    const genericApplication = await applications.createSubmitted({
      formId: generic.form.id,
      applicantUserId: studentId,
      studentProfileId,
      actorUserId: studentId,
      answers: { motivation: "generic" },
    });
    expect(
      await prisma.coreCommitteeSelectionCandidate.findFirst({
        where: { applicationId: genericApplication.id },
      }),
    ).toBeNull();
    const f = await fixture();
    const application = await applications.createSubmitted({
      formId: f.form.id,
      applicantUserId: studentId,
      studentProfileId,
      actorUserId: studentId,
      answers: { motivation: "selection" },
      coreCommitteeSelectionPositionIds: [f.position.id],
    });
    const candidate = await prisma.coreCommitteeSelectionCandidate.findFirstOrThrow({
      where: { applicationId: application.id },
    });
    expect(candidate.selectionId).toBe(f.selection.id);
  });
  it("enforces candidate-position composite integrity and idempotent association", async () => {
    const f = await fixture();
    const application = await applications.createSubmitted({
      formId: f.form.id,
      applicantUserId: studentId,
      studentProfileId,
      actorUserId: studentId,
      answers: {},
      coreCommitteeSelectionPositionIds: [f.position.id],
    });
    const associate = () =>
      prisma.$transaction((tx) =>
        associateCoreCommitteeSelectionCandidate(tx, {
          formId: f.form.id,
          applicationId: application.id,
          applicantUserId: studentId,
          coreCommitteeSelectionPositionIds: [f.position.id],
        }),
      );
    await Promise.all([associate(), associate()]);
    const candidate = await prisma.coreCommitteeSelectionCandidate.findFirstOrThrow({
      where: { applicationId: application.id },
    });
    const other = await fixture();
    await expect(
      prisma.coreCommitteeSelectionCandidatePosition.create({
        data: {
          selectionId: f.selection.id,
          candidateId: candidate.id,
          positionId: other.position.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("records review and decisions only against an active Council for the selection year, then makes finalization immutable", async () => {
    const f = await fixture();
    const application = await applications.createSubmitted({
      formId: f.form.id,
      applicantUserId: studentId,
      studentProfileId,
      actorUserId: studentId,
      answers: {},
      coreCommitteeSelectionPositionIds: [f.position.id],
    });
    const candidate = await prisma.coreCommitteeSelectionCandidate.findFirstOrThrow({
      where: { applicationId: application.id },
    });
    await prisma.coreCommitteeSelection.update({
      where: { id: f.selection.id },
      data: { status: "COUNCIL_REVIEW" },
    });
    const council = await prisma.committee.create({
      data: {
        name: `Council ${randomUUID()}`,
        type: "STUDENT_COUNCIL",
        academicYear: "2026-2027",
        memberships: { create: { userId: councilMemberId } },
      },
    });
    committeeIds.push(council.id);
    expect(await repository.currentCouncilCommittee(f.selection.id, councilMemberId)).toBe(
      council.id,
    );
    await repository.recordCouncilReview({
      selectionId: f.selection.id,
      candidateId: candidate.id,
      positionId: f.position.id,
      councilCommitteeId: council.id,
      councilMemberUserId: councilMemberId,
      note: "Reviewed",
    });
    const decision = await repository.recordDecision({
      selectionId: f.selection.id,
      candidateId: candidate.id,
      positionId: f.position.id,
      councilCommitteeId: council.id,
      councilMemberUserId: councilMemberId,
      outcome: "SELECTED",
      internalNote: "Recorded Council decision",
    });
    await repository.finalizeDecision({
      selectionId: f.selection.id,
      decisionId: decision.id,
      actorUserId: secretaryId,
    });
    await expect(
      repository.recordDecision({
        selectionId: f.selection.id,
        candidateId: candidate.id,
        positionId: f.position.id,
        councilCommitteeId: council.id,
        councilMemberUserId: councilMemberId,
        outcome: "NOT_SELECTED",
        internalNote: "Attempted change",
      }),
    ).rejects.toThrow("immutable");
  });
});
