import { beforeEach, describe, expect, it } from "vitest";
import type { AuthenticatedActor } from "../../../src/modules/auth";
import { SearchStudentsUseCase } from "../../../src/modules/students/application/use-cases/search-students";
import { NotAuthorizedError } from "../../../src/lib/errors";
import { InMemoryStudentRepository } from "../../support/fakes/in-memory-student-repository";

const secretary: AuthenticatedActor = { userId: "sec-1", role: "SECRETARY" };
const coordinatorA: AuthenticatedActor = { userId: "coord-1", role: "COORDINATOR", batchScope: ["batch-a"] };
const coordinatorNone: AuthenticatedActor = { userId: "coord-2", role: "COORDINATOR", batchScope: [] };
const student: AuthenticatedActor = { userId: "stu-1", role: "STUDENT", studentProfileId: "sp-1" };
const recruiter: AuthenticatedActor = { userId: "rec-1", role: "RECRUITER" };

describe("SearchStudentsUseCase", () => {
  let repo: InMemoryStudentRepository;
  let useCase: SearchStudentsUseCase;

  beforeEach(async () => {
    repo = new InMemoryStudentRepository();
    useCase = new SearchStudentsUseCase({ studentRepository: repo });

    repo.seedBatchInfo("batch-a", { batchName: "B.Arch 2026", batchStatus: "ACTIVE" });
    repo.seedBatchInfo("batch-b", { batchName: "B.Arch 2025", batchStatus: "GRADUATED" });

    const alice = await repo.create({
      userId: "u1",
      batchId: "batch-a",
      rollNumber: "BA2026001",
      fullName: "Alice Architect",
      private: { cgpa: 9.2 },
      actorUserId: "sec-1",
    });
    repo.seedProfileData(alice.id, { skills: ["Rendering"], software: ["Rhino", "Revit"] });

    const bob = await repo.create({
      userId: "u2",
      batchId: "batch-a",
      rollNumber: "BA2026002",
      fullName: "Bob Builder",
      private: { cgpa: 6.5 },
      actorUserId: "sec-1",
    });
    repo.seedProfileData(bob.id, { skills: ["Modeling"], software: ["AutoCAD"] });

    const carol = await repo.create({
      userId: "u3",
      batchId: "batch-b",
      rollNumber: "BA2025001",
      fullName: "Carol Craftsperson",
      private: { cgpa: 7.8 },
      actorUserId: "sec-1",
    });
    repo.seedProfileData(carol.id, { skills: ["Rendering"], software: ["SketchUp"] });
  });

  it("Secretary sees all students across all batches", async () => {
    const results = await useCase.execute({ actor: secretary, filters: {} });
    expect(results).toHaveLength(3);
  });

  it("filters by name (case-insensitive, partial match)", async () => {
    const results = await useCase.execute({ actor: secretary, filters: { name: "alice" } });
    expect(results.map((r) => r.fullName)).toEqual(["Alice Architect"]);
  });

  it("filters by roll number", async () => {
    const results = await useCase.execute({ actor: secretary, filters: { rollNumber: "BA2025001" } });
    expect(results).toHaveLength(1);
    expect(results[0]!.fullName).toBe("Carol Craftsperson");
  });

  it("filters by batch", async () => {
    const results = await useCase.execute({ actor: secretary, filters: { batchId: "batch-a" } });
    expect(results.map((r) => r.fullName).sort()).toEqual(["Alice Architect", "Bob Builder"]);
  });

  it("filters by graduation/batch status", async () => {
    const results = await useCase.execute({ actor: secretary, filters: { batchStatus: "GRADUATED" } });
    expect(results.map((r) => r.fullName)).toEqual(["Carol Craftsperson"]);
  });

  it("filters by skills", async () => {
    const results = await useCase.execute({ actor: secretary, filters: { skills: ["Rendering"] } });
    expect(results.map((r) => r.fullName).sort()).toEqual(["Alice Architect", "Carol Craftsperson"]);
  });

  it("filters by software", async () => {
    const results = await useCase.execute({ actor: secretary, filters: { software: ["AutoCAD"] } });
    expect(results.map((r) => r.fullName)).toEqual(["Bob Builder"]);
  });

  it("filters by CGPA range (private access only — enforced by this endpoint being Secretary/Coordinator-only)", async () => {
    const results = await useCase.execute({ actor: secretary, filters: { cgpaMin: 8 } });
    expect(results.map((r) => r.fullName)).toEqual(["Alice Architect"]);
  });

  it("returns CGPA in results (this is the admin directory, not the recruiter-facing one)", async () => {
    const results = await useCase.execute({ actor: secretary, filters: { name: "Alice" } });
    expect(results[0]!.cgpa).toBe(9.2);
  });

  it("restricts a Coordinator's results to their assigned batch scope", async () => {
    const results = await useCase.execute({ actor: coordinatorA, filters: {} });
    expect(results.map((r) => r.fullName).sort()).toEqual(["Alice Architect", "Bob Builder"]);
  });

  it("denies a Coordinator explicitly filtering by a batch outside their scope (brief's named boundary)", async () => {
    await expect(
      useCase.execute({ actor: coordinatorA, filters: { batchId: "batch-b" } }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("returns an empty list for a Coordinator with no batch scope", async () => {
    const results = await useCase.execute({ actor: coordinatorNone, filters: {} });
    expect(results).toEqual([]);
  });

  it("denies a Student from searching the directory", async () => {
    await expect(useCase.execute({ actor: student, filters: {} })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("denies a Recruiter from searching this (admin) directory", async () => {
    await expect(useCase.execute({ actor: recruiter, filters: {} })).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("excludes archived (inactive) students by default", async () => {
    const results = await useCase.execute({ actor: secretary, filters: {} });
    const activeCount = results.length;

    const alice = results.find((r) => r.fullName === "Alice Architect")!;
    await repo.setActive(alice.id, false);

    const afterArchive = await useCase.execute({ actor: secretary, filters: {} });
    expect(afterArchive).toHaveLength(activeCount - 1);
  });

  it("includes archived students when includeInactive is set", async () => {
    const results = await useCase.execute({ actor: secretary, filters: {} });
    const alice = results.find((r) => r.fullName === "Alice Architect")!;
    await repo.setActive(alice.id, false);

    const withInactive = await useCase.execute({
      actor: secretary,
      filters: { includeInactive: true },
    });
    expect(withInactive.map((r) => r.fullName)).toContain("Alice Architect");
  });
});
