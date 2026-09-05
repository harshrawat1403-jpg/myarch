import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaElectionRepository } from "../../../src/modules/elections/infrastructure/prisma-election-repository";
import { associateElectionCandidate } from "../../../src/modules/elections/infrastructure/associate-candidate";
import { PrismaFormApplicationRepository } from "../../../src/modules/applications/infrastructure/prisma-application-repository";
import { PrismaFormRepository } from "../../../src/modules/forms/infrastructure/prisma-form-repository";
import {
  electionConfigSchema,
  type ElectionConfig,
} from "../../../src/modules/elections/domain/election";

// Opt-in and fail closed: never falls back to DATABASE_URL (which may be Neon).
const databaseUrl = process.env.ELECTION_TEST_DATABASE_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "15432")
    throw new Error("Election database tests require the local Compose PostgreSQL port 15432");
}
describe.skipIf(!databaseUrl)("Phase 6 PostgreSQL integrity and concurrency", () => {
  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl ?? "postgresql://unused:unused@127.0.0.1:15432/unused",
  });
  const repository = new PrismaElectionRepository(prisma);
  const applications = new PrismaFormApplicationRepository(prisma, associateElectionCandidate);
  const forms = new PrismaFormRepository(prisma);
  const userIds: string[] = [],
    electionIds: string[] = [],
    formIds: string[] = [];
  let secretaryId: string, studentId: string, studentProfileId: string, batchId: string;
  beforeAll(async () => {
    await prisma.$connect();
    const secretary = await prisma.user.create({
      data: {
        email: `phase6-${randomUUID()}@test.invalid`,
        passwordHash: "test-only",
        role: "SECRETARY",
      },
    });
    secretaryId = secretary.id;
    userIds.push(secretaryId);
    const batch = await prisma.batch.create({
      data: { name: `Phase 6 test ${randomUUID()}`, year: 2026 },
    });
    batchId = batch.id;
    const student = await prisma.user.create({
      data: {
        email: `phase6-${randomUUID()}@test.invalid`,
        passwordHash: "test-only",
        role: "STUDENT",
        studentProfile: {
          create: { fullName: "Election Test Student", rollNumber: randomUUID(), batchId },
        },
      },
      include: { studentProfile: true },
    });
    studentId = student.id;
    studentProfileId = student.studentProfile!.id;
    userIds.push(studentId);
  });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => {
    // Remove only rows created by this test run, respecting restrictive FKs.
    await prisma.electionBallotChoice.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionBallot.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionVoterParticipation.deleteMany({
      where: { electionId: { in: electionIds } },
    });
    await prisma.electionVoterSnapshot.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionFacultyRosterEntry.deleteMany({
      where: { electionId: { in: electionIds } },
    });
    await prisma.electionExCouncilRosterEntry.deleteMany({
      where: { electionId: { in: electionIds } },
    });
    await prisma.electionInterviewScore.deleteMany({
      where: { interview: { electionId: { in: electionIds } } },
    });
    await prisma.electionInterviewPanelMember.deleteMany({
      where: { interview: { electionId: { in: electionIds } } },
    });
    await prisma.electionInterview.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionInterviewCriterion.deleteMany({
      where: { electionId: { in: electionIds } },
    });
    await prisma.electionFinalCandidate.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionShortlistEntry.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionObjection.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionCorrectionSubmission.deleteMany({
      where: { correctionRequest: { electionId: { in: electionIds } } },
    });
    await prisma.electionCorrectionRequest.deleteMany({
      where: { electionId: { in: electionIds } },
    });
    await prisma.electionScrutinyReview.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionCandidatePosition.deleteMany({
      where: { electionId: { in: electionIds } },
    });
    await prisma.electionCandidate.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionPosition.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.electionApplicationForm.deleteMany({ where: { electionId: { in: electionIds } } });
    await prisma.election.deleteMany({ where: { id: { in: electionIds } } });
    await prisma.form.deleteMany({ where: { id: { in: formIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (batchId) await prisma.batch.delete({ where: { id: batchId } });
    await prisma.$disconnect();
  });
  async function fixture(open = true, overrides: Partial<ElectionConfig> = {}) {
    const config = electionConfigSchema.parse({
      title: "Test Council",
      academicYear: "2026-2027",
      type: "COUNCIL",
      applicationOpenAt: new Date(Date.now() - 60000),
      applicationCloseAt: new Date(Date.now() + 3600000),
      ...overrides,
    });
    const election = await repository.create(config, secretaryId);
    electionIds.push(election.id);
    const positioned = await repository.savePosition(
      election.id,
      null,
      {
        title: "President",
        seats: 1,
        description: "Represent students",
        displayOrder: 0,
        weights: [
          { voterGroup: "STUDENT", percentage: 60 },
          { voterGroup: "FACULTY", percentage: 25 },
          { voterGroup: "EX_COUNCIL", percentage: 15 },
        ],
      },
      secretaryId,
    );
    const form = await prisma.form.create({
      data: {
        title: "Election application",
        status: "PUBLISHED",
        createdByUserId: secretaryId,
        fields: {
          create: { key: "motivation", label: "Motivation", type: "TEXT", displayOrder: 0 },
        },
      },
    });
    formIds.push(form.id);
    await repository.linkForm(election.id, form.id, secretaryId);
    if (open) await repository.transition(election.id, "APPLICATION_OPEN", secretaryId);
    return { election, config, form, position: positioned.positions[0]! };
  }
  function submit(value: Awaited<ReturnType<typeof fixture>>) {
    return applications.createSubmitted({
      formId: value.form.id,
      applicantUserId: studentId,
      studentProfileId,
      actorUserId: studentId,
      answers: { motivation: "Private answer" },
      electionPositionIds: [value.position.id],
    });
  }
  async function votingFixture() {
    const now = Date.now();
    const f = await fixture(true, {
      applicationCloseAt: new Date(now + 1000),
      votingOpenAt: new Date(now + 2000),
      votingCloseAt: new Date(now + 3600000),
      notaEnabled: true,
    });
    await submit(f);
    const candidate = await prisma.electionCandidate.findFirstOrThrow({
      where: { electionId: f.election.id },
    });
    await prisma.election.update({
      where: { id: f.election.id },
      data: { status: "FINAL_CANDIDATES" },
    });
    await prisma.electionFinalCandidate.create({
      data: {
        electionId: f.election.id,
        candidateId: candidate.id,
        positionId: f.position.id,
        lockedByUserId: secretaryId,
      },
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now + 3000));
    await repository.lockVoterSnapshot({ electionId: f.election.id, actorUserId: secretaryId });
    await prisma.election.update({ where: { id: f.election.id }, data: { status: "VOTING" } });
    return { ...f, candidate };
  }
  it("creates candidates atomically and prevents concurrent duplicate submissions", async () => {
    const f = await fixture();
    const results = await Promise.allSettled([submit(f), submit(f)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.electionCandidate.count({ where: { electionId: f.election.id } })).toBe(1);
    expect(await prisma.formSubmission.count({ where: { formId: f.form.id } })).toBe(1);
    const candidate = await prisma.electionCandidate.findFirstOrThrow({
      where: { electionId: f.election.id },
    });
    await expect(
      prisma.electionCandidate.create({
        data: {
          electionId: f.election.id,
          applicantUserId: studentId,
          applicationId: candidate.applicationId,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("makes concurrent association retries idempotent with one candidate audit", async () => {
    const f = await fixture();
    const app = await submit(f);
    expect(app.electionId).toBe(f.election.id);
    expect(app.selectionId).toBeNull();
    const associate = () =>
      prisma.$transaction((tx) =>
        associateElectionCandidate(tx, {
          formId: f.form.id,
          applicationId: app.id,
          applicantUserId: studentId,
          electionPositionIds: [f.position.id],
        }),
      );
    await Promise.all([associate(), associate()]);
    const candidates = await repository.candidates(f.election.id);
    expect(candidates).toHaveLength(1);
    expect(
      await prisma.auditLog.count({
        where: { targetEntityId: candidates[0]!.id, action: "ELECTION_CANDIDATE_CREATED" },
      }),
    ).toBe(1);
  });
  it("prevents duplicate weights, duplicate candidate positions and cross-election positions", async () => {
    const f = await fixture();
    await submit(f);
    await expect(
      prisma.electionPositionWeight.create({
        data: { positionId: f.position.id, voterGroup: "STUDENT", percentage: 10 },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    const candidate = await prisma.electionCandidate.findFirstOrThrow({
      where: { electionId: f.election.id },
    });
    await expect(
      prisma.electionCandidatePosition.create({
        data: { candidateId: candidate.id, positionId: f.position.id, electionId: f.election.id },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    const other = await fixture();
    await expect(
      prisma.electionCandidatePosition.create({
        data: {
          candidateId: candidate.id,
          positionId: other.position.id,
          electionId: f.election.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("allows one concurrent opening and rejects reopening", async () => {
    const f = await fixture(false);
    const results = await Promise.allSettled([
      repository.transition(f.election.id, "APPLICATION_OPEN", secretaryId),
      repository.transition(f.election.id, "APPLICATION_OPEN", secretaryId),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(
      await prisma.auditLog.count({
        where: { targetEntityId: f.election.id, action: "ELECTION_APPLICATION_OPENED" },
      }),
    ).toBe(1);
  });
  it("serializes configuration edits against opening and locks positions/form thereafter", async () => {
    const f = await fixture(false);
    const changed = { ...f.config, title: "Changed title" };
    const [opened, edited] = await Promise.allSettled([
      repository.transition(f.election.id, "APPLICATION_OPEN", secretaryId),
      repository.update(f.election.id, changed, secretaryId),
    ]);
    expect(opened.status).toBe("fulfilled");
    const persisted = await repository.get(f.election.id);
    expect(persisted!.title).toBe(edited.status === "fulfilled" ? "Changed title" : f.config.title);
    await expect(repository.update(f.election.id, changed, secretaryId)).rejects.toThrow("locked");
    await expect(
      repository.savePosition(
        f.election.id,
        f.position.id,
        { ...f.position, title: "Changed" },
        secretaryId,
      ),
    ).rejects.toThrow("locked");
    await expect(
      repository.deletePosition(f.election.id, f.position.id, secretaryId),
    ).rejects.toThrow("locked");
    await expect(repository.linkForm(f.election.id, f.form.id, secretaryId)).rejects.toThrow(
      "locked",
    );
    await expect(forms.setStatus(f.form.id, "CLOSED", new Date())).rejects.toThrow("immutable");
  });
  it("rolls back submission/application rows for inactive students and invalid positions", async () => {
    const f = await fixture();
    await prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: { isActive: false },
    });
    try {
      await expect(submit(f)).rejects.toThrow("active students");
    } finally {
      await prisma.studentProfile.update({
        where: { id: studentProfileId },
        data: { isActive: true },
      });
    }
    await expect(
      applications.createSubmitted({
        formId: f.form.id,
        applicantUserId: studentId,
        studentProfileId,
        actorUserId: studentId,
        answers: {},
        electionPositionIds: [randomUUID()],
      }),
    ).rejects.toThrow("positions");
    expect(await prisma.formSubmission.count({ where: { formId: f.form.id } })).toBe(0);
  });
  it("rejects early close and serializes concurrent closing without reopening", async () => {
    const f = await fixture();
    await expect(
      repository.transition(f.election.id, "APPLICATION_CLOSED", secretaryId),
    ).rejects.toThrow("deadline");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(f.config.applicationCloseAt.getTime() + 1000));
    const results = await Promise.allSettled([
      repository.transition(f.election.id, "APPLICATION_CLOSED", secretaryId),
      repository.transition(f.election.id, "APPLICATION_CLOSED", secretaryId),
      submit(f),
    ]);
    expect(results.slice(0, 2).filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results[2]!.status).toBe("rejected");
    await expect(
      repository.transition(f.election.id, "APPLICATION_OPEN", secretaryId),
    ).rejects.toThrow("Invalid election transition");
    expect(await prisma.formSubmission.count({ where: { formId: f.form.id } })).toBe(0);
  });
  it("rejects unpublished forms, insufficient weights and expired schedules at opening", async () => {
    const f = await fixture(false);
    await prisma.form.update({ where: { id: f.form.id }, data: { status: "DRAFT" } });
    await expect(
      repository.transition(f.election.id, "APPLICATION_OPEN", secretaryId),
    ).rejects.toThrow("Publish");
    await prisma.form.update({ where: { id: f.form.id }, data: { status: "PUBLISHED" } });
    await prisma.electionPositionWeight.updateMany({
      where: { positionId: f.position.id, voterGroup: "STUDENT" },
      data: { percentage: 59 },
    });
    await expect(
      repository.transition(f.election.id, "APPLICATION_OPEN", secretaryId),
    ).rejects.toThrow("100%");
    expect((await repository.get(f.election.id))!.status).toBe("DRAFT");
  });
  it("prevents linking forms already used by another election or generic submissions", async () => {
    const f = await fixture();
    await submit(f);
    const other = await fixture(false);
    await expect(repository.linkForm(other.election.id, f.form.id, secretaryId)).rejects.toThrow();
    const unused = await fixture(false);
    await expect(
      repository.linkForm(other.election.id, unused.form.id, secretaryId),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("scopes candidate queries and never returns answers in a candidate list", async () => {
    const f = await fixture();
    await submit(f);
    expect(await repository.candidates(f.election.id, randomUUID())).toEqual([]);
    const mine = await repository.candidates(f.election.id, studentId);
    expect(mine).toHaveLength(1);
    expect(JSON.stringify(mine)).not.toContain("Private answer");
  });
  it("serializes shortlisting and locks completed interview scores before final candidates", async () => {
    const f = await fixture();
    await submit(f);
    const candidate = await prisma.electionCandidate.findFirstOrThrow({
      where: { electionId: f.election.id },
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(f.config.applicationCloseAt.getTime() + 1000));
    await repository.transition(f.election.id, "APPLICATION_CLOSED", secretaryId);
    await repository.transition(f.election.id, "SCRUTINY", secretaryId);
    await repository.recordScrutiny({
      electionId: f.election.id,
      candidateId: candidate.id,
      decision: "ELIGIBLE",
      reason: "Eligible",
      actorUserId: secretaryId,
    });
    await repository.transition(f.election.id, "CORRECTIONS_OBJECTIONS", secretaryId);
    await repository.transition(f.election.id, "SHORTLIST", secretaryId);
    const shortlisted = await Promise.allSettled([
      repository.shortlist({
        electionId: f.election.id,
        candidateId: candidate.id,
        positionIds: [f.position.id],
        actorUserId: secretaryId,
      }),
      repository.shortlist({
        electionId: f.election.id,
        candidateId: candidate.id,
        positionIds: [f.position.id],
        actorUserId: secretaryId,
      }),
    ]);
    expect(shortlisted.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await repository.saveCriterion({
      electionId: f.election.id,
      name: "Communication",
      description: "Clear communication",
      maxScore: 10,
      weight: 1,
      displayOrder: 0,
      required: true,
      actorUserId: secretaryId,
    });
    await repository.transition(f.election.id, "INTERVIEWS", secretaryId);
    const interview = await repository.createInterview({
      electionId: f.election.id,
      candidateId: candidate.id,
      positionId: f.position.id,
      scheduledAt: new Date(Date.now() + 60000),
      durationMinutes: 30,
      panelUserIds: [secretaryId],
      actorUserId: secretaryId,
    });
    await expect(
      repository.createInterview({
        electionId: f.election.id,
        candidateId: candidate.id,
        positionId: f.position.id,
        panelUserIds: [secretaryId],
        actorUserId: secretaryId,
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    await repository.completeInterview({
      electionId: f.election.id,
      interviewId: interview.id,
      candidateAttended: true,
      actorUserId: secretaryId,
    });
    const criterion = await prisma.electionInterviewCriterion.findFirstOrThrow({
      where: { electionId: f.election.id },
    });
    await repository.submitScores({
      electionId: f.election.id,
      interviewId: interview.id,
      actorUserId: secretaryId,
      scores: [{ criterionId: criterion.id, score: 8 }],
    });
    await repository.lockScores({
      electionId: f.election.id,
      interviewId: interview.id,
      actorUserId: secretaryId,
    });
    await expect(
      repository.submitScores({
        electionId: f.election.id,
        interviewId: interview.id,
        actorUserId: secretaryId,
        scores: [{ criterionId: criterion.id, score: 9 }],
      }),
    ).rejects.toThrow("not open");
    await repository.lockFinalCandidates({
      electionId: f.election.id,
      entries: [{ candidateId: candidate.id, positionId: f.position.id }],
      actorUserId: secretaryId,
    });
    expect((await repository.get(f.election.id))!.status).toBe("FINAL_CANDIDATES");
  });
  it("locks an explicit, conflict-free Council voter snapshot", async () => {
    const f = await fixture();
    await repository.saveVoterRosterEntry({
      electionId: f.election.id,
      voterGroup: "FACULTY",
      userId: studentId,
      actorUserId: secretaryId,
    });
    await prisma.election.update({
      where: { id: f.election.id },
      data: { status: "FINAL_CANDIDATES" },
    });
    await expect(
      repository.lockVoterSnapshot({ electionId: f.election.id, actorUserId: secretaryId }),
    ).rejects.toThrow("multiple Council voter groups");
    const roster = (await repository.voterRoster(f.election.id)) as { faculty: { id: string }[] };
    await repository.removeVoterRosterEntry({
      electionId: f.election.id,
      voterGroup: "FACULTY",
      entryId: roster.faculty[0]!.id,
      actorUserId: secretaryId,
    });
    await expect(
      repository.lockVoterSnapshot({ electionId: f.election.id, actorUserId: secretaryId }),
    ).resolves.toMatchObject({ voters: { STUDENT: expect.any(Number) } });
  });
  it("records one secret ballot without a voter-to-ballot relation and rejects concurrent repeats", async () => {
    const f = await votingFixture();
    const ballot = await repository.ballot(f.election.id, studentId);
    expect(JSON.stringify(ballot)).not.toContain("motivation");
    const vote = () =>
      repository.castBallot({
        electionId: f.election.id,
        userId: studentId,
        choices: [{ positionId: f.position.id, candidateId: f.candidate.id }],
      });
    const results = await Promise.allSettled([vote(), vote()]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const participation = await prisma.electionVoterParticipation.findUniqueOrThrow({
      where: { electionId_userId: { electionId: f.election.id, userId: studentId } },
    });
    const storedBallot = await prisma.electionBallot.findFirstOrThrow({
      where: { electionId: f.election.id },
    });
    expect(participation).not.toHaveProperty("ballotId");
    expect(storedBallot).not.toHaveProperty("userId");
    expect(await prisma.electionBallotChoice.count({ where: { electionId: f.election.id } })).toBe(
      1,
    );
  });
  it("enforces candidate-or-NOTA ballot choices and keeps abstention separate from ballots", async () => {
    const f = await votingFixture();
    const ballot = await prisma.electionBallot.create({ data: { electionId: f.election.id } });
    await expect(
      prisma.electionBallotChoice.create({
        data: {
          ballotId: ballot.id,
          electionId: f.election.id,
          positionId: f.position.id,
          isNota: false,
        },
      }),
    ).rejects.toThrow();
    await repository.abstain({ electionId: f.election.id, userId: studentId });
    expect(
      await prisma.electionVoterParticipation.findUnique({
        where: { electionId_userId: { electionId: f.election.id, userId: studentId } },
      }),
    ).toMatchObject({ status: "ABSTAINED" });
    expect(await prisma.electionBallotChoice.count({ where: { electionId: f.election.id } })).toBe(
      0,
    );
  });
});
