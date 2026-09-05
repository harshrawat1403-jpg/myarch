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
});
